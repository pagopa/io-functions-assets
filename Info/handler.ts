import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import * as express from "express";

import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as packageJson from "../package.json";

import { envConfig, IConfig } from "../utils/config";

interface IInfo {
  readonly name: string;
  readonly version: string;
}

type InfoHandler = () => Promise<
  IResponseSuccessJson<IInfo> | IResponseErrorInternal
>;

type HealthChecker = (
  config: unknown
) => healthcheck.HealthCheck<"AzureStorage" | "Config" | "AzureCosmosDB", true>;

export const InfoHandler = (
  healthCheck: HealthChecker
): InfoHandler => (): ReturnType<InfoHandler> =>
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

export const Info = (): express.RequestHandler => {
  const handler = InfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      c => healthcheck.checkAzureCosmosDbHealth(c.COSMOSDB_URI, c.COSMOSDB_KEY),
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      c => healthcheck.checkAzureStorageHealth(c.CachedStorageConnection)
    ])
  );

  return wrapRequestHandler(handler);
};
