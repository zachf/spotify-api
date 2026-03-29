import express from "express";
import type { Server } from "http";

const TIMEOUT_MS = 60_000;

export function waitForAuthCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const app = express();
    let server: Server;

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for Spotify authorization (60s)"));
    }, TIMEOUT_MS);

    app.get("/callback", (req, res) => {
      const code = req.query.code as string | undefined;
      const error = req.query.error as string | undefined;

      if (error || !code) {
        res.send("<h2>Authorization failed. You can close this tab.</h2>");
        clearTimeout(timeout);
        server.close();
        reject(new Error(`Spotify authorization denied: ${error ?? "no code returned"}`));
        return;
      }

      res.send("<h2>Authorization successful! You can close this tab.</h2>");
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server = app.listen(port);
  });
}
