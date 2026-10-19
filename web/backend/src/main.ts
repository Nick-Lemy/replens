import { createApp } from './app.js';
import { readConfig } from './config/config.js';

async function bootstrap() {
  const config = readConfig();
  const app = await createApp(config);
  await app.listen(config.port, config.host);
}
void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
