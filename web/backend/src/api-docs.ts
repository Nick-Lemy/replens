import type { OpenAPIObject } from "@nestjs/swagger";

const jsonBody = (schema: object, description: string) => ({
  required: true,
  description,
  content: { "application/json": { schema } },
});

const jsonResponse = (
  description: string,
  schema: object = { type: "object", additionalProperties: true },
) => ({
  description,
  content: { "application/json": { schema } },
});

const errorResponse = (description: string) =>
  jsonResponse(description, { $ref: "#/components/schemas/ApiError" });

const authOperation = (
  summary: string,
  extra: Record<string, unknown> = {},
) => ({
  tags: ["Authentication"],
  summary,
  description:
    "Uses the same-origin HttpOnly session cookie. Sign in through this API in Swagger UI first; browser requests include cookies automatically. Never copy a token into browser storage or use a bearer token.",
  responses: {},
  ...extra,
});

export function addRepLensApiPaths(
  document: OpenAPIObject,
  production: boolean,
): OpenAPIObject {
  document.components ??= {};
  document.components.securitySchemes = {
    ...document.components.securitySchemes,
    RepLensSessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: production
        ? "__Secure-better-auth.session_token"
        : "better-auth.session_token",
      description:
        "HttpOnly session cookie set by sign-in. Do not enter or copy a cookie value here; authenticate through the documented endpoint and let the same-origin browser request include it.",
    },
  };
  document.components.schemas = {
    ...document.components.schemas,
    ApiError: {
      anyOf: [
        {
          type: "object",
          required: ["code", "message"],
          properties: { code: { type: "string" }, message: { type: "string" } },
        },
        {
          type: "object",
          required: ["statusCode", "message", "error"],
          properties: {
            statusCode: { type: "integer" },
            message: { type: "string" },
            error: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["message"],
          properties: { message: { type: "string" } },
        },
      ],
    },
    User: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        emailVerified: { type: "boolean" },
        image: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    SignUpResult: {
      type: "object",
      required: ["user"],
      properties: {
        token: {
          type: "string",
          nullable: true,
          description:
            "Native Better Auth response field. Do not store or use this value; browser authentication uses the HttpOnly cookie.",
        },
        user: { $ref: "#/components/schemas/User" },
      },
    },
    SignInResult: {
      type: "object",
      required: ["redirect", "token", "user"],
      properties: {
        redirect: { type: "boolean", enum: [false] },
        token: {
          type: "string",
          description:
            "Native Better Auth response field. Do not store or use this value; browser authentication uses the HttpOnly cookie.",
        },
        url: { type: "string", nullable: true },
        user: { $ref: "#/components/schemas/User" },
      },
    },
    CurrentSessionResult: {
      type: "object",
      nullable: true,
      properties: {
        session: {
          type: "object",
          description:
            "Current session metadata; authentication is maintained by the HttpOnly cookie.",
        },
        user: { $ref: "#/components/schemas/User" },
      },
    },
  };
  document.paths = {
    ...document.paths,
    "/api/auth/sign-up/email": {
      post: authOperation("Create an account and sign in", {
        requestBody: jsonBody(
          { $ref: "#/components/schemas/SignUpEmail" },
          "Name, email, and password.",
        ),
        responses: {
          "200": jsonResponse(
            "Created user; sets an HttpOnly cookie. Do not store or use the native response token field.",
            { $ref: "#/components/schemas/SignUpResult" },
          ),
          "400": errorResponse("Invalid input."),
          "422": errorResponse("Email is already registered."),
        },
      }),
    },
    "/api/auth/sign-in/email": {
      post: authOperation("Sign in with email and password", {
        requestBody: jsonBody(
          { $ref: "#/components/schemas/SignInEmail" },
          "Account credentials.",
        ),
        responses: {
          "200": jsonResponse(
            "Signed in; sets an HttpOnly cookie. Do not store or use the native response token field.",
            { $ref: "#/components/schemas/SignInResult" },
          ),
          "401": errorResponse("Credentials are invalid."),
        },
      }),
    },
    "/api/auth/sign-out": {
      post: authOperation("Sign out and revoke the session", {
        security: [{ RepLensSessionCookie: [] }],
        requestBody: jsonBody(
          { type: "object", additionalProperties: false },
          "An empty JSON object.",
        ),
        responses: { "200": jsonResponse("Signed out.") },
      }),
    },
    "/api/auth/get-session": {
      get: authOperation("Get the current session", {
        responses: {
          "200": jsonResponse("Current session, or null when signed out.", {
            $ref: "#/components/schemas/CurrentSessionResult",
          }),
        },
      }),
    },
    "/api/auth/send-verification-email": {
      post: authOperation(
        "Send a verification email to the signed-in account",
        {
          security: [{ RepLensSessionCookie: [] }],
          requestBody: jsonBody(
            { $ref: "#/components/schemas/SendVerificationEmail" },
            "The email must match the signed-in account.",
          ),
          responses: {
            "200": jsonResponse(
              "Verification email accepted by the configured provider.",
            ),
            "400": errorResponse(
              "The email differs from the signed-in account.",
            ),
            "401": errorResponse("Sign in required."),
            "503": errorResponse("Email sending is not configured or failed."),
          },
        },
      ),
    },
    "/api/auth/verify-email": {
      get: authOperation("Confirm an email verification token", {
        description:
          "Call only after the user explicitly confirms. The token is valid for one hour. This endpoint changes email verification state.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": jsonResponse("Email verified."),
          "400": errorResponse("Token is invalid or expired."),
        },
      }),
    },
    "/api/auth/request-password-reset": {
      post: authOperation("Request a password reset", {
        description:
          "Returns the same generic acknowledgment for known and unknown addresses. The response means the request was processed, not that email delivery succeeded. Reset links expire after 15 minutes.",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/RequestPasswordReset" },
          "Email address and configured frontend redirect.",
        ),
        responses: {
          "200": jsonResponse(
            "Generic acknowledgment; does not confirm account existence or mail delivery.",
          ),
          "400": errorResponse("Invalid input."),
          "503": errorResponse("Email sending is not configured."),
        },
      }),
    },
    "/api/auth/reset-password": {
      post: authOperation("Set a new password using a reset token", {
        requestBody: jsonBody(
          { $ref: "#/components/schemas/ResetPassword" },
          "A valid, one-use reset token and new password.",
        ),
        responses: {
          "200": jsonResponse(
            "Password changed; existing sessions are revoked.",
          ),
          "400": errorResponse("Token or input is invalid."),
        },
      }),
    },
    "/api/auth/update-user": {
      post: authOperation("Update the signed-in user display name", {
        security: [{ RepLensSessionCookie: [] }],
        requestBody: jsonBody(
          { $ref: "#/components/schemas/UpdateUser" },
          "Only the trimmed display name can be changed.",
        ),
        responses: {
          "200": jsonResponse("Name updated."),
          "400": errorResponse("Name invalid or another field was provided."),
          "401": errorResponse("Sign in required."),
        },
      }),
    },
    "/api/auth/delete-user": {
      post: authOperation("Delete the signed-in account", {
        security: [{ RepLensSessionCookie: [] }],
        requestBody: jsonBody(
          { $ref: "#/components/schemas/DeleteUser" },
          "The current password is required, including for a fresh session.",
        ),
        responses: {
          "200": jsonResponse("Account deleted and session cleared."),
          "401": errorResponse("Sign in required or password invalid."),
        },
      }),
    },
  };
  document.components.schemas = {
    ...document.components.schemas,
    SignUpEmail: {
      type: "object",
      required: ["name", "email", "password"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1, maxLength: 80 },
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 12, maxLength: 128 },
      },
    },
    SignInEmail: {
      type: "object",
      required: ["email", "password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 12, maxLength: 128 },
      },
    },
    SendVerificationEmail: {
      type: "object",
      required: ["email"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email" },
        callbackURL: { type: "string", format: "uri" },
      },
    },
    RequestPasswordReset: {
      type: "object",
      required: ["email"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email" },
        redirectTo: { type: "string", format: "uri" },
      },
    },
    ResetPassword: {
      type: "object",
      required: ["token", "newPassword"],
      additionalProperties: false,
      properties: {
        token: { type: "string" },
        newPassword: { type: "string", minLength: 12, maxLength: 128 },
      },
    },
    UpdateUser: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: { name: { type: "string", minLength: 1, maxLength: 80 } },
    },
    DeleteUser: {
      type: "object",
      required: ["password"],
      additionalProperties: false,
      properties: { password: { type: "string", minLength: 1 } },
    },
    WorkoutSessionDraft: {
      type: "object",
      required: [
        "clientId",
        "startedAt",
        "endedAt",
        "completedReps",
        "interrupted",
      ],
      additionalProperties: false,
      properties: {
        clientId: { type: "string", format: "uuid" },
        startedAt: { type: "string", format: "date-time" },
        endedAt: { type: "string", format: "date-time" },
        completedReps: { type: "integer", minimum: 0, maximum: 1000 },
        interrupted: { type: "boolean" },
      },
    },
    WorkoutSession: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        exerciseId: { type: "string", example: "two-arm-dumbbell-curl" },
        counterVersion: { type: "string", example: "world-full-v1" },
        startedAt: { type: "string", format: "date-time" },
        endedAt: { type: "string", format: "date-time" },
        durationSeconds: { type: "integer" },
        completedReps: { type: "integer" },
        interrupted: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
    WorkoutSessionPage: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/WorkoutSession" },
        },
        nextCursor: {
          type: "string",
          nullable: true,
          description: "Opaque cursor for the next page.",
        },
      },
    },
    ExercisePhotoSet: {
      type: "object",
      properties: {
        images: { type: "array", items: { type: "string", format: "uri" } },
        sourceUrl: { type: "string", format: "uri" },
        credit: { type: "string" },
        creditUrl: { type: "string", format: "uri" },
        license: { type: "string" },
        licenseUrl: { type: "string", format: "uri" },
        variation: { type: "string" },
      },
    },
    ExerciseGuide: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        group: {
          type: "string",
          enum: ["Arms", "Chest", "Back", "Shoulders", "Legs", "Core"],
        },
        equipment: { type: "string" },
        focus: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 2,
          },
        },
        tips: { type: "array", items: { type: "string" } },
        referenceUrl: { type: "string", format: "uri" },
        referenceLabel: { type: "string" },
        cameraPreview: { type: "boolean" },
        photos: { $ref: "#/components/schemas/ExercisePhotoSet" },
      },
    },
    ExerciseGuideList: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/ExerciseGuide" },
        },
        groups: { type: "array", items: { type: "string" } },
      },
    },
  };
  Object.assign(document.paths, {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          "200": jsonResponse("API is running.", {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
            },
          }),
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get the signed-in account",
        description:
          "Requires the same-origin HttpOnly session cookie. Returns 401 when signed out.",
        security: [{ RepLensSessionCookie: [] }],
        responses: {
          "200": jsonResponse("Current user.", {
            type: "object",
            properties: { user: { $ref: "#/components/schemas/User" } },
          }),
          "401": { description: "Sign in required." },
        },
      },
    },
    "/api/workout-sessions": {
      post: {
        tags: ["Workout sessions"],
        security: [{ RepLensSessionCookie: [] }],
        summary: "Save a session summary",
        description:
          "Requires sign-in, an allowed Origin, and JSON. These are client-reported estimates, not validated study or medical data. Duration, exercise ID, counter version, and creation time are server-derived. Same-client retries return 200; conflicting retries return 409.",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/WorkoutSessionDraft" },
          "Exactly these five fields are accepted. Times must be valid ISO date-times, start before end, duration at most two hours, and no more than five minutes in the future.",
        ),
        responses: {
          "201": jsonResponse("Created.", {
            $ref: "#/components/schemas/WorkoutSession",
          }),
          "200": jsonResponse(
            "Idempotent retry returned the existing record.",
            { $ref: "#/components/schemas/WorkoutSession" },
          ),
          "400": errorResponse("Invalid body or timestamp."),
          "401": errorResponse("Sign in required."),
          "409": errorResponse(
            "Client ID was previously used with different data.",
          ),
          "403": errorResponse("Origin is not allowed."),
          "415": errorResponse("JSON content type required."),
        },
      },
      get: {
        tags: ["Workout sessions"],
        security: [{ RepLensSessionCookie: [] }],
        summary: "List the signed-in user session summaries",
        description:
          "Requires sign-in. Newest sessions first; cursor is opaque and signed. Limit defaults to 20 and is capped at 50. Unknown query parameters are rejected.",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": jsonResponse("Page of summaries.", {
            $ref: "#/components/schemas/WorkoutSessionPage",
          }),
          "400": errorResponse("Invalid query or cursor."),
          "401": errorResponse("Sign in required."),
        },
      },
    },
    "/api/workout-sessions/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        tags: ["Workout sessions"],
        security: [{ RepLensSessionCookie: [] }],
        summary: "Get an owned session summary",
        description: "Requires sign-in. Other users’ records return 404.",
        responses: {
          "200": jsonResponse("Session summary.", {
            $ref: "#/components/schemas/WorkoutSession",
          }),
          "401": errorResponse("Sign in required."),
          "404": errorResponse("Session not found."),
        },
      },
      delete: {
        tags: ["Workout sessions"],
        security: [{ RepLensSessionCookie: [] }],
        summary: "Delete an owned session summary",
        description:
          "Requires sign-in, an allowed Origin, and JSON. The API accepts an absent body or an empty JSON object; Swagger sends `{}` to ensure the required application/json content type is present.",
        requestBody: {
          required: false,
          description:
            "Optional empty JSON body; the request must still use application/json.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                maxProperties: 0,
                additionalProperties: false,
                example: {},
              },
            },
          },
        },
        responses: {
          "204": { description: "Deleted." },
          "400": errorResponse("Body must be empty."),
          "401": errorResponse("Sign in required."),
          "403": errorResponse("Origin is not allowed."),
          "404": errorResponse("Session not found."),
          "415": errorResponse("JSON content type required."),
        },
      },
    },
    "/api/exercises": {
      get: {
        tags: ["Exercise guides"],
        summary: "List all curated exercise guides",
        description:
          "Public, read-only catalog. Query parameters are not supported. Only the two-arm dumbbell curl guide enables camera preview; this does not imply validated rep tracking or RIR support for other guides.",
        responses: {
          "200": jsonResponse("Guide catalog and groups.", {
            $ref: "#/components/schemas/ExerciseGuideList",
          }),
          "400": errorResponse("Query parameters are unsupported."),
        },
      },
    },
    "/api/exercises/{id}": {
      get: {
        tags: ["Exercise guides"],
        summary: "Get one curated exercise guide",
        description:
          "Public, read-only catalog. Query parameters are not supported.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": jsonResponse("Exercise guide including photo credits.", {
            $ref: "#/components/schemas/ExerciseGuide",
          }),
          "400": errorResponse("Query parameters are unsupported."),
          "404": errorResponse("Guide not found."),
        },
      },
    },
    "/api/tracking/config": {
      get: {
        tags: ["Live tracking assets"],
        summary: "Get the available local tracking asset configuration",
        description:
          "Public configuration with same-origin asset URLs. Returns 503 until the pinned model and WASM assets are provisioned.",
        responses: {
          "200": jsonResponse("Tracking runtime configuration.", {
            type: "object",
            properties: {
              runtimeVersion: { type: "string" },
              modelUrl: { type: "string" },
              wasmRoot: { type: "string" },
              exerciseId: { type: "string" },
            },
          }),
          "503": errorResponse("Tracking assets are unavailable."),
        },
      },
    },
    "/api/tracking/assets/{version}/{filename}": {
      get: {
        tags: ["Live tracking assets"],
        summary: "Download an allow-listed versioned tracking asset",
        description:
          "Public, read-only binary asset endpoint. Only allow-listed filenames and the pinned version are served; files are local and never proxied from a client-provided URL.",
        parameters: [
          {
            name: "version",
            in: "path",
            required: true,
            schema: {
              type: "string",
              example: "tasks-vision-1.1.1-pose-full-float16-1",
            },
          },
          {
            name: "filename",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "vision_wasm_internal.js",
                "vision_wasm_internal.wasm",
                "vision_wasm_module_internal.js",
                "vision_wasm_module_internal.wasm",
                "vision_wasm_nosimd_internal.js",
                "vision_wasm_nosimd_internal.wasm",
                "pose_landmarker_full_v1.task",
              ],
            },
          },
        ],
        responses: {
          "200": {
            description: "Versioned WASM, JavaScript, or pose task asset.",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
              "application/wasm": {
                schema: { type: "string", format: "binary" },
              },
              "text/javascript": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "404": { description: "Version or filename is not supported." },
          "503": errorResponse("Asset file is not provisioned."),
        },
      },
    },
  });
  return document;
}
