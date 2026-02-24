# Project Instructions

## Settings Page Maintenance

The settings page at `src/app/settings/page.tsx` displays all providers, their models, documentation links, and API key management URLs.

**Whenever you add, remove, or modify models in `src/lib/models.ts` or provider implementations in `src/lib/providers/`, you must also update the settings page to reflect those changes.** This includes:

- Adding or removing a provider from the `providers` array in `src/app/settings/page.tsx`
- Updating documentation URLs (`docsUrl`) or API key management URLs (`apiKeysUrl`)
- Updating the provider `envVar` if the environment variable name changes
- Updating the provider `description` if capabilities change

The model tables on the settings page are derived automatically from the model arrays in `src/lib/models.ts` (`IMAGE_MODELS`, `VIDEO_MODELS`, `IMAGE_TO_VIDEO_MODELS`, `UPSCALE_MODELS`), so adding models there will automatically surface them on the settings page. However, adding an entirely new provider requires a new entry in the `providers` array in the settings page.
