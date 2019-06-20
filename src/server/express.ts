import * as bodyParser from "body-parser";
import * as express from "express";
import * as path from "path";
import PORT from "./env";

export default function init() {
  const app: express.Application = express();
  app.set("port", PORT);
  app.use(bodyParser.urlencoded({
    extended: true,
  }));
  app.use("/css", express.static("public/css"));
  app.use("/js", express.static("public/js"));
  app.use("/images", express.static("public/images"));
  app.use("/fonts", express.static("public/fonts"));

  app.use(bodyParser.json());

  app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../public/index.html"));
  });
  return app;
}
