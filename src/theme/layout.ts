/** Inner height of the floating tab pill (icons + labels). */
export const TAB_BAR_HEIGHT = 60;

/** Extra space so the raised center button does not cover content. */
export const TAB_BAR_CENTER_LIFT = 18;

/** Scroll padding above the tab-bar layout slot. */
export const TAB_BAR_CLEARANCE = 32;

export function getTabBarOccupiedHeight(bottomInset: number) {
  return TAB_BAR_CENTER_LIFT + TAB_BAR_HEIGHT + Math.max(bottomInset, 8);
}
