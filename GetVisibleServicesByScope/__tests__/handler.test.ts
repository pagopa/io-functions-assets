// tslint:disable:no-any

import { NonNegativeInteger } from "italia-ts-commons/lib/numbers";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "italia-ts-commons/lib/strings";

import {
  NewService,
  RetrievedService,
  Service,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "io-functions-commons/dist/src/models/service";
import {
  VISIBLE_SERVICE_CONTAINER,
  VisibleService
} from "io-functions-commons/dist/src/models/visible_service";

import { MaxAllowedPaymentAmount } from "io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";

import { none } from "fp-ts/lib/Option";
import { BlobNotFoundCode } from "io-functions-commons/dist/src/utils/azure_storage";
import { aCosmosResourceMetadata } from "../../__mocks__/mocks";
import {
  GetVisibleServicesByScope,
  GetVisibleServicesByScopeHandler
} from "../handler";

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;

const aService: Service = {
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

const aNewService: NewService = {
  ...aService,
  kind: "INewService"
};

const aRetrievedService: RetrievedService = {
  ...aNewService,
  ...aCosmosResourceMetadata,
  id: "123" as NonEmptyString,
  kind: "IRetrievedService",
  version: 1 as NonNegativeInteger
};

const aVisibleService: VisibleService = {
  ...aCosmosResourceMetadata,
  departmentName: aRetrievedService.departmentName,
  id: aRetrievedService.id,
  organizationFiscalCode: aRetrievedService.organizationFiscalCode,
  organizationName: aRetrievedService.organizationName,
  requireSecureChannels: false,
  serviceId: aRetrievedService.serviceId,
  serviceName: aRetrievedService.serviceName,
  version: aRetrievedService.version
};

const servicesByScopeBlobId = "blob_id" as NonEmptyString;
describe("GetVisibleServicesByScopeHandler", () => {
  it("should get all visible services grouped by scope", async () => {
    const blobStorageMock = {
      getBlobToText: jest.fn().mockImplementation((_, __, ___, cb) => {
        cb(
          undefined,
          JSON.stringify({
            LOCAL: [aVisibleService.serviceId],
            NATIONAL: [aVisibleService.serviceId]
          })
        );
      })
    };
    const getVisibleServicesHandler = GetVisibleServicesByScopeHandler(
      blobStorageMock as any,
      servicesByScopeBlobId
    );
    const response = await getVisibleServicesHandler();

    expect(blobStorageMock.getBlobToText).toHaveBeenCalledWith(
      VISIBLE_SERVICE_CONTAINER,
      servicesByScopeBlobId,
      {},
      expect.any(Function)
    );
    expect(response.kind).toEqual("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual({
        LOCAL: [aVisibleService.serviceId],
        NATIONAL: [aVisibleService.serviceId]
      });
    }
  });

  it("should return Not found if no blob was found", async () => {
    const blobStorageMock = {
      getBlobToText: jest.fn().mockImplementation((_, __, ___, cb) => {
        cb({ code: BlobNotFoundCode }, none);
      })
    };
    const getVisibleServicesHandler = GetVisibleServicesByScopeHandler(
      blobStorageMock as any,
      servicesByScopeBlobId
    );
    const response = await getVisibleServicesHandler();

    expect(blobStorageMock.getBlobToText).toHaveBeenCalledWith(
      VISIBLE_SERVICE_CONTAINER,
      servicesByScopeBlobId,
      {},
      expect.any(Function)
    );
    expect(response.kind).toEqual("IResponseErrorNotFound");
  });
});

describe("GetVisibleServices", () => {
  it("should set up authentication middleware", async () => {
    GetVisibleServicesByScope({} as any, servicesByScopeBlobId);
  });
});
