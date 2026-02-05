export type InventoryUIDom = {
  hotbarContainer: HTMLElement;
  inventoryGrid: HTMLElement;
  inventoryMenu: HTMLElement;
  tooltip: HTMLElement;
};

function requiredElement(id: string): HTMLElement {
  return document.getElementById(id)!;
}

export function resolveInventoryDom(): InventoryUIDom {
  const hotbarContainer = requiredElement("hotbar");
  const inventoryGrid = requiredElement("inventory-grid");
  const inventoryMenu = requiredElement("inventory-menu");
  let tooltip = document.getElementById("tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "tooltip";
    document.body.appendChild(tooltip);
  }

  return {
    hotbarContainer,
    inventoryGrid,
    inventoryMenu,
    tooltip,
  };
}
