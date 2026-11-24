/**
 * launchUpdate.test.ts
 *
 * The launch-time OTA rules: a newly published update is applied on the
 * launch that finds it (not the next cold start), but a missing, slow or
 * failed update never holds the splash screen past its deadline.
 */

import { decideLaunchUpdate, type LaunchUpdateState } from '../launchUpdate';

/** Launch just started: expo-updates is checking, nothing found yet. */
const CHECKING: LaunchUpdateState = {
  enabled: true,
  isStartupProcedureRunning: true,
  isUpdateAvailable: false,
  isDownloading: false,
  isUpdatePending: false,
  canReload: true,
  checkTimedOut: false,
  downloadTimedOut: false,
  reloadFailed: false,
};

const DOWNLOADING: LaunchUpdateState = {
  ...CHECKING,
  isUpdateAvailable: true,
  isDownloading: true,
};

const DOWNLOADED: LaunchUpdateState = {
  ...DOWNLOADING,
  isDownloading: false,
  isUpdatePending: true,
};

describe('decideLaunchUpdate', () => {
  it('opens the app straight away when OTA updates are off (dev, web)', () => {
    expect(decideLaunchUpdate({ ...DOWNLOADED, enabled: false })).toBe(
      'continue',
    );
  });

  it('waits while expo-updates is still checking', () => {
    expect(decideLaunchUpdate(CHECKING)).toBe('wait');
  });

  it('opens the app once the check finds nothing new', () => {
    expect(
      decideLaunchUpdate({ ...CHECKING, isStartupProcedureRunning: false }),
    ).toBe('continue');
  });

  it('stops waiting for a check that hangs past the check deadline', () => {
    expect(decideLaunchUpdate({ ...CHECKING, checkTimedOut: true })).toBe(
      'continue',
    );
  });

  it('keeps waiting for a found update past the check deadline', () => {
    expect(decideLaunchUpdate({ ...DOWNLOADING, checkTimedOut: true })).toBe(
      'wait',
    );
  });

  it('waits between finding an update and starting its download', () => {
    expect(
      decideLaunchUpdate({ ...DOWNLOADING, isDownloading: false }),
    ).toBe('wait');
  });

  it('reloads as soon as the update is on the device', () => {
    expect(decideLaunchUpdate(DOWNLOADED)).toBe('reload');
  });

  it('reloads even if the startup procedure already ended', () => {
    expect(
      decideLaunchUpdate({ ...DOWNLOADED, isStartupProcedureRunning: false }),
    ).toBe('reload');
  });

  it('does not reload while the database is still initializing', () => {
    expect(decideLaunchUpdate({ ...DOWNLOADED, canReload: false })).toBe(
      'wait',
    );
  });

  it('gives up on a slow download at the download deadline', () => {
    expect(
      decideLaunchUpdate({
        ...DOWNLOADING,
        checkTimedOut: true,
        downloadTimedOut: true,
      }),
    ).toBe('continue');
  });

  it('gives up on a downloaded update still waiting for the database at the deadline', () => {
    expect(
      decideLaunchUpdate({
        ...DOWNLOADED,
        canReload: false,
        downloadTimedOut: true,
      }),
    ).toBe('continue');
  });

  it('keeps reloading if the deadline passes mid-restart', () => {
    expect(
      decideLaunchUpdate({
        ...DOWNLOADED,
        checkTimedOut: true,
        downloadTimedOut: true,
      }),
    ).toBe('reload');
  });

  it('opens the app when the download fails', () => {
    expect(
      decideLaunchUpdate({
        ...DOWNLOADING,
        isDownloading: false,
        isStartupProcedureRunning: false,
      }),
    ).toBe('continue');
  });

  it('opens the app when the reload is rejected', () => {
    expect(decideLaunchUpdate({ ...DOWNLOADED, reloadFailed: true })).toBe(
      'continue',
    );
  });
});
