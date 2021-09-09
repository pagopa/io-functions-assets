import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import * as express from "express";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import * as packageJson from "../package.json";
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";

import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

import { envConfig, IConfig } from "../utils/config";

interface IInfo {
  name: string;
  version: string;
}

type InfoHandler = () => Promise<
  IResponseSuccessJson<IInfo> | IResponseErrorInternal
>;

type HealthChecker = (
  config: unknown
) => healthcheck.HealthCheck<healthcheck.ProblemSource, true>;

export function InfoHandler(healthCheck: HealthChecker): InfoHandler {
  return () =>
    pipe(
      envConfig,
      healthCheck,
      TE.bimap(
        problems => ResponseErrorInternal(problems.join("\n\n")),
        _ =>
          ResponseSuccessJson({
            name: packageJson.name,
            version: packageJson.version
          })
      ),
      TE.toUnion
    )();
}

export function Info(): express.RequestHandler {
  const handler = InfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      c => healthcheck.checkAzureCosmosDbHealth(c.COSMOSDB_URI, c.COSMOSDB_KEY),
      c => healthcheck.checkAzureStorageHealth(c.CachedStorageConnection)
    ])
  );

  return wrapRequestHandler(handler);
}
