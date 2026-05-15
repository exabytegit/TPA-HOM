import catalogData from "../../config/toyota-plan.catalog.json";
import { AppError } from "../../utils/appError";
import { catalogSchema } from "./toyotaPlan.schemas";
import { ToyotaPlanCatalogItem } from "./toyotaPlan.types";

export class ToyotaPlanCatalogService {
  private readonly catalog: ToyotaPlanCatalogItem[];

  constructor(rawCatalog: unknown = catalogData) {
    this.catalog = catalogSchema.parse(rawCatalog);
  }

  getCatalog(): ToyotaPlanCatalogItem[] {
    return [...this.catalog];
  }

  findCatalogItemBySlug(slug: string): ToyotaPlanCatalogItem | undefined {
    return this.catalog.find((item) => item.slug === slug);
  }

  getEnabledCatalogItemBySlug(slug: string): ToyotaPlanCatalogItem {
    const item = this.findCatalogItemBySlug(slug);

    if (!item) {
      throw new AppError(404, "Catalog item not found", "TOYOTA_PLAN_CATALOG_NOT_FOUND");
    }

    if (!item.enabled) {
      throw new AppError(400, "Catalog item disabled", "TOYOTA_PLAN_CATALOG_DISABLED");
    }

    if (item.seller !== "HOM") {
      throw new AppError(500, "Toyota Plan catalog misconfigured", "TOYOTA_PLAN_SELLER_INVALID");
    }

    return item;
  }
}

export const toyotaPlanCatalogService = new ToyotaPlanCatalogService();
