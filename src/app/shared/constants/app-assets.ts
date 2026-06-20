import { environment } from '../../../environments/environment';

function versionedAsset(path: string): string {
  const version = environment.assetVersion;
  return version ? `${path}?v=${version}` : path;
}

export const APP_ASSETS = {
  logo: versionedAsset('assets/logo.png'),
} as const;
