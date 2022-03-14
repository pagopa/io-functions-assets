import {
  EmailString,
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import { MaxAllowedPaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";
import { NotificationChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannel";
import { ServicePublic } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicePublic";
import {
  NewService,
  RetrievedService,
  Service,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { CosmosResource } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

export const aEmail = "email@example.com" as EmailString;
export const aEmailChanged = "email.changed@example.com" as EmailString;

export const aFiscalCode = "SPNDNL80A13Y555X" as FiscalCode;

// CosmosResourceMetadata
export const aCosmosResourceMetadata: Omit<CosmosResource, "id"> = {
  _etag: "_etag",
  _rid: "_rid",
  _self: "_self",
  _ts: 1
};

export const aNewDate = new Date();

export const aTokenId = "01DQ79RZ0EQ0S7RTA3SMCKRCCA";
export const aValidator = "d6e57ed8d3c3eb4583d671c7";
export const aValidatorHash =
  "35aef908716592e5dd48ccc4f58ef1a286de8dfd58d9a7a050cf47c60b662154";

export const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;

export const aServicePayload: ServicePublic = {
  department_name: "MyDeptName" as NonEmptyString,
  organization_fiscal_code: anOrganizationFiscalCode,
  organization_name: "MyOrgName" as NonEmptyString,
  service_id: "MySubscriptionId" as NonEmptyString,
  service_name: "MyServiceName" as NonEmptyString,
  version: 1
};

export const aService: Service = {
  authorizedCIDRs: toAuthorizedCIDRs([]),
  authorizedRecipients: toAuthorizedRecipients([]),
  departmentName: "MyDeptName" as NonEmptyString,
  isVisible: true,
  maxAllowedPaymentAmount: 0 as MaxAllowedPaymentAmount,
  organizationFiscalCode: anOrganizationFiscalCode,
  organizationName: "MyOrgName" as NonEmptyString,
  requireSecureChannels: false,
  serviceId: "MySubscriptionId" as NonEmptyString,
  serviceName: "MyServiceName" as NonEmptyString
};

export const aNewService: NewService = {
  ...aService,
  kind: "INewService"
};

export const aVersion = 1 as NonNegativeInteger;

export const aRetrievedService: RetrievedService = {
  ...aNewService,
  ...aCosmosResourceMetadata,
  id: "123" as NonEmptyString,
  kind: "IRetrievedService",
  version: aVersion
};

export const aSeralizedService: ServicePublic = {
  ...aServicePayload,
  available_notification_channels: [
    NotificationChannelEnum.EMAIL,
    NotificationChannelEnum.WEBHOOK
  ],
  version: aVersion
};
