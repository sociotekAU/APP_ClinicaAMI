import type { PublicInventoryItem } from "@ami/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelatedProductsCarousel } from "./related-products-carousel";

const PRODUCTS: PublicInventoryItem[] = [
  { id: 2, name: "Vitamina C", type: "medicamento", unit: "frasco", imageUrl: null, availability: "available", medicationName: "Ácido ascórbico" },
  { id: 3, name: "Guantes clínicos", type: "material_clinico", unit: "caja", imageUrl: "/productos/guantes.webp", availability: "limited", medicationName: null },
];

describe("RelatedProductsCarousel", () => {
  it("muestra el estado pendiente cuando no existen otros productos", () => {
    const markup = renderToStaticMarkup(<RelatedProductsCarousel products={[]} />);

    expect(markup).toContain("Productos pendientes de actualizar.");
  });

  it("genera enlaces hacia cada producto relacionado", () => {
    const markup = renderToStaticMarkup(<RelatedProductsCarousel products={PRODUCTS} />);

    expect(markup).toContain('href="/productos/2"');
    expect(markup).toContain('href="/productos/3"');
    expect(markup).toContain("Vitamina C");
    expect(markup).toContain("Guantes clínicos");
  });
});
