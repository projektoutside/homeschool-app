export async function enterBirdsCampaign(surface) {
  await surface.locator('#singlePlayerButton').click();
  const resume = surface.locator('#continuePlayButton');
  await (await resume.isVisible() ? resume : surface.locator('#progressivePlayButton')).click();
  const begin = surface.locator('#overlayPrimary');
  if (await begin.isVisible()) await begin.click();
}

export async function buyRouteHint(surface) {
  await surface.locator('#shopButton').click();
  const buy = surface.locator('[data-shop-action="hint"]');
  await buy.click();
  if (!await buy.isDisabled()) throw new Error('The shop did not apply the purchased route hint.');
  await surface.locator('#resumeFromShop').click();
}
