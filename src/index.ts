
import app from './app'
import config from './config/config';

const port = config.server.port

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});