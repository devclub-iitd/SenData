import * as bodyParser from "body-parser";
import * as express from "express";
import PORT from "./env";

export default function init(): Express.Application {
  const app: express.Application = express();
  app.set("port", PORT);
  app.use(bodyParser.urlencoded({
    extended: true,
  }));
  app.use(express.static("public"));
  // body parser
  app.use(bodyParser.json());
  app.get("/", (req, res): void => {
    // res.sendFile(path.resolve(__dirname + "/../../public/index.html"));
    res.render("login");
  });
  return app;
}
