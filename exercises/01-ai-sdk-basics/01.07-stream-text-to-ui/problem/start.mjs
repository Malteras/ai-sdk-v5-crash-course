import { runLocalDevServer } from '../../../../shared/run-local-dev-server.ts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await runLocalDevServer({
  root: __dirname,
});
