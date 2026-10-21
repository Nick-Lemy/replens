import type { INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import { AUTH_BRIDGE_ROUTES } from "../auth/auth-bridge.js";
import { AuthService } from "../auth/auth.service.js";
import type { AppConfig } from "../config/config.js";

const authenticatedRoutes = new Set([
  "/api/auth/sign-out",
  "/api/auth/send-verification-email",
  "/api/auth/update-user",
  "/api/auth/delete-user",
]);

function normalizeAuthPath(path: string): string {
  if (path.startsWith("/api/auth/")) return path;
  return `/api/auth/${path.replace(/^\/+/, "").replace(/^api\/auth\//, "")}`;
}

function mergeBetterAuthSchema(
  document: OpenAPIObject,
  schema: OpenAPIObject,
  config: AppConfig,
): void {
  document.openapi = schema.openapi;
  document.components ??= {};
  document.components.schemas = {
    ...schema.components?.schemas,
    ...document.components.schemas,
  };
  document.components.securitySchemes = {
    RepLensSessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: config.production
        ? "__Secure-better-auth.session_token"
        : "better-auth.session_token",
      description:
        "HttpOnly cookie set by sign-in. Do not copy or enter cookie values; same-origin browser requests include the cookie automatically.",
    },
  };
  delete document.security;

  for (const [generatedPath, generatedItem] of Object.entries(
    schema.paths ?? {},
  )) {
    const path = normalizeAuthPath(generatedPath);
    const allowedMethod = AUTH_BRIDGE_ROUTES.get(path)?.toLowerCase();
    if (!allowedMethod || !generatedItem) continue;

    const pathItem = { ...generatedItem };
    for (const method of [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "options",
      "head",
      "trace",
    ] as const) {
      if (method !== allowedMethod) delete pathItem[method];
    }
    const operation = pathItem[allowedMethod as keyof typeof pathItem];
    if (
      operation &&
      typeof operation === "object" &&
      "responses" in operation
    ) {
      operation.security = authenticatedRoutes.has(path)
        ? [{ RepLensSessionCookie: [] }]
        : [];
      operation.tags = ["Authentication"];
      if (path === "/api/auth/send-verification-email") {
        operation.description =
          `${operation.description ?? ""} This API requires a signed-in account and only sends to its current email address.`.trim();
      } else if (path === "/api/auth/request-password-reset") {
        operation.description =
          `${operation.description ?? ""} This API returns a generic acknowledgment for known and unknown email addresses; it does not confirm delivery. Email actions return 503 if Resend is not configured.`.trim();
      } else if (path === "/api/auth/reset-password") {
        operation.description =
          `${operation.description ?? ""} Reset links expire after 15 minutes and successful reset revokes all account sessions.`.trim();
      } else if (path === "/api/auth/verify-email") {
        operation.description =
          `${operation.description ?? ""} Verification links expire after one hour. Confirm with the user before consuming a token.`.trim();
      } else if (path === "/api/auth/sign-in/social") {
        operation.description =
          `${operation.description ?? ""} RepLens supports only Google's browser redirect flow. Set provider to "google", disableRedirect to true to receive a URL for browser navigation, and use an approved frontend callbackURL. Client-supplied ID tokens are rejected. Google routes return 503 when the paired server credentials are absent.`.trim();
        if (!config.googleClientId || !config.googleClientSecret) {
          operation.responses = {
            ...operation.responses,
            "503": { description: "Google OAuth is not configured." },
          };
        }
      }
    }
    document.paths[path] = { ...document.paths[path], ...pathItem };
  }
}

export async function configureSwagger(
  app: INestApplication,
  config: AppConfig,
): Promise<void> {
  const openApiConfig = new DocumentBuilder()
    .setTitle("RepLens API")
    .setDescription(
      "RepLens account, exercise guide, live tracking asset, and personal session-summary API. Browser authentication uses the same-origin HttpOnly session cookie.",
    )
    .setVersion("1.0")
    .setOpenAPIVersion("3.1.1")
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  const auth = app.get(AuthService).auth;
  const authSchema =
    (await auth.api.generateOpenAPISchema()) as unknown as OpenAPIObject;
  mergeBetterAuthSchema(document, authSchema, config);

  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: {
      validatorUrl: null,
      withCredentials: true,
      persistAuthorization: false,
      requestInterceptor: (request: {
        url: string;
        method?: string;
        credentials?: RequestCredentials;
        headers?: Record<string, string>;
        body?: string;
      }) => {
        request.credentials = "include";
        if (
          request.method?.toUpperCase() === "DELETE" &&
          /\/api\/workout-sessions\/[^/?]+(?:\?.*)?$/.test(request.url)
        ) {
          request.headers = {
            ...request.headers,
            "Content-Type": "application/json",
          };
          request.body ??= "{}";
        }
        return request;
      },
    },
  });
}
