'use client';


import { Button } from '@quorvexa/ui';
import { Card, CardContent, CardHeader } from '@quorvexa/ui';
import { Spinner } from '@quorvexa/ui';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { usePreferences, useResetPreferences, useUpdatePreferences } from '@/hooks/use-preferences';

interface SettingsForm {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
}

export default function SettingsPage() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const resetPrefs = useResetPreferences();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>();

  useEffect(() => {
    if (prefs) {
      reset({
        theme: prefs.theme,
        locale: prefs.locale,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        emailNotifications: prefs.emailNotifications,
        twoFactorEnabled: prefs.twoFactorEnabled,
      });
    }
  }, [prefs, reset]);

  const onSubmit = (data: SettingsForm) => {
    updatePrefs.mutate(data);
  };

  const handleReset = () => {
    resetPrefs.mutate(undefined, {
      onSuccess: () => reset(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" label="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <h2 className="font-semibold">Appearance</h2>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">Theme</label>
              <select
                id="theme"
                {...register('theme')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium mb-1">Date Format</label>
              <select
                id="dateFormat"
                {...register('dateFormat')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Regional */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <h2 className="font-semibold">Regional</h2>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <label htmlFor="locale" className="block text-sm font-medium mb-1">Locale</label>
              <input
                id="locale"
                type="text"
                {...register('locale')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.locale && <p className="text-xs text-destructive mt-1">{errors.locale.message}</p>}
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium mb-1">Timezone</label>
              <input
                id="timezone"
                type="text"
                {...register('timezone')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.timezone && <p className="text-xs text-destructive mt-1">{errors.timezone.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Security */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <h2 className="font-semibold">Notifications & Security</h2>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('emailNotifications')}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <span className="text-sm font-medium">Email Notifications</span>
                <p className="text-xs text-muted-foreground">Receive email updates about your workflows</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('twoFactorEnabled')}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <span className="text-sm font-medium">Two-Factor Authentication</span>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" loading={updatePrefs.isPending}>
            Save Changes
          </Button>
          <Button type="button" variant="outline" loading={resetPrefs.isPending} onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>

        {updatePrefs.isSuccess && (
          <p className="text-sm text-green-600">Settings saved successfully.</p>
        )}
        {updatePrefs.isError && (
          <p className="text-sm text-destructive">{updatePrefs.error.message}</p>
        )}
      </form>
    </div>
  );
}
