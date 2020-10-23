import { Context } from "@azure/functions";

import * as express from "express";
import { rights } from "fp-ts/lib/Array";
import { ServiceId } from "io-functions-commons/dist/generated/definitions/ServiceId";

import {
  SERVICE_COLLECTION_NAME,
  ServiceModel
} from "io-functions-commons/dist/src/models/service";

import { secureExpressApp } from "io-functions-commons/dist/src/utils/express";
import { setAppContext } from "io-functions-commons/dist/src/utils/middlewares/context_middleware";

import createAzureFunctionHandler from "io-functions-express/dist/src/createAzureFunctionsHandler";
import { getConfigOrThrow } from "../utils/config";

import { cosmosdbInstance } from "../utils/cosmosdb";
import { GetServiceMetadata } from "./handler";

const config = getConfigOrThrow();

const lowerCaseServiceIds = rights(
  config.LOWERCASE_SERVICE_IDS.split(",").map(_ => ServiceId.decode(_))
);
// Setup Express
const app = express();
secureExpressApp(app);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME)
);

app.get(
  "/services/:serviceid.json",
  GetServiceMetadata(serviceModel, lowerCaseServiceIds)
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
