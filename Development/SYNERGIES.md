# Synergy recipes for Golden Crafters

Golden Crafters are implemented. The live recipe list in `synergy-recipes.js` includes **Supernova + Luminous Nova ? The Princess and the Key**. Both ingredients must be MAX level. The synergy has no EX skill yet.

A recipe needs:

- `id`: unique recipe identifier.
- `ingredients`: two weapon IDs. Both must be equipped and at their own MAX level.
- `result`: the synergy weapon descriptor, including `id`, `name`, `icon` and `maxLevel`.
- Optional `description` for the fusion preview.
- Optional `createWeapon()` returning a fresh, fully initialized result weapon. Its ID must match `result.id`.

Weapon damage/attacks and any new EX skill still need their normal weapon-controller implementation; a recipe only defines a valid fusion. Do not register a recipe for an unimplemented weapon.

On confirmation the two ingredients become one result weapon in the earlier slot; the second slot becomes empty. No Credits or pending level-up choices are spent. One Golden Crafter is consumed. Cancellation or a stale/invalid pair leaves it intact. One enchantment from each ingredient is preserved, including duplicate enchantments, for a maximum of two inherited enchantments.

Automatic drops roll `(1 + fullRunMinutes / 20) / 100` per enemy defeat, only while an eligible recipe exists and no Golden Crafter is on the ground. The admin **Spawn Golden Crafter** button bypasses recipe eligibility for visual/menu testing, while retaining the one-drop limit. Without a valid recipe its menu cannot fuse or consume weapons.
