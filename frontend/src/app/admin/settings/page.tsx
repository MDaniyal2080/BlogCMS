'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { settingsAPI, uploadAPI } from '@/lib/api';
import { Setting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { useSettings } from '@/components/public/SettingsContext';

export default function SettingsPage() {
  const { assetUrl } = useSettings();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Allowed keys hardening and legacy key normalization
  const ALLOWED_KEYS = new Set<string>([
    'site_name',
    'site_tagline',
    'site_description',
    'site_url',
    'contact_email',
    'site_logo_url',
    'favicon_url',
    'og_image_url',
    'facebook_url',
    'twitter_url',
    'instagram_url',
    'linkedin_url',
    'github_url',
    'contact_phone',
    'contact_address',
    'meta_title',
    'meta_description',
    'meta_keywords',
    'enable_comments',
    'enable_registration',
    'posts_per_page',
    // Newly managed keys
    'home_hero_title',
    'home_hero_subtitle',
    'featured_posts_count',
    'timezone',
    // Email service / SMTP
    'email_enabled',
    'smtp_host',
    'smtp_port',
    'smtp_secure',
    'smtp_username',
    'smtp_password',
    'smtp_from_name',
    'smtp_from_email',
  ]);

  const normalizeKeyName = (key: string) =>
    key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const isValidUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const setFieldError = (key: string, message = '') =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message; else delete next[key];
      return next;
    });

  const validateUrlField = (key: string, value?: string) => {
    const v = (value ?? '').trim();
    if (!v) return setFieldError(key, '');
    if (!isValidUrl(v)) return setFieldError(key, 'Please enter a valid URL (https://...)');
    setFieldError(key, '');
  };

  const validateEmailField = (key: string, value?: string) => {
    const v = (value ?? '').trim();
    if (!v) return setFieldError(key, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setFieldError(key, 'Please enter a valid email address');
    setFieldError(key, '');
  };

  const validateForm = () => {
    const urlKeys = ['site_url', 'facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url', 'github_url'];
    const newErrors: Record<string, string> = {};
    urlKeys.forEach((k) => {
      const v = (formData[k] || '').trim();
      if (v && !isValidUrl(v)) newErrors[k] = 'Please enter a valid URL (https://...)';
    });
    // Email service validations
    const emailEnabled = formData.email_enabled === 'true';
    if (emailEnabled) {
      const host = (formData.smtp_host || '').trim();
      const portStr = (formData.smtp_port || '').trim();
      const fromEmail = (formData.smtp_from_email || '').trim();
      if (!host) newErrors.smtp_host = 'SMTP host is required when email service is enabled';
      if (!portStr) {
        newErrors.smtp_port = 'SMTP port is required when email service is enabled';
      } else {
        const port = Number(portStr);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          newErrors.smtp_port = 'Please enter a valid port number (1-65535)';
        }
      }
      if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
        newErrors.smtp_from_email = 'Please enter a valid from email address';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      const settingsData = response.data;
      setSettings(settingsData);

      const initialData: Record<string, string> = {};
      settingsData.forEach((setting: Setting) => {
        const nk = normalizeKeyName(setting.key);
        if (ALLOWED_KEYS.has(nk)) {
          // Prefer first non-empty value if duplicates map to same normalized key
          if (initialData[nk] === undefined || initialData[nk] === '') {
            initialData[nk] = setting.value;
          }
        }
      });
      // Do not prefill smtp_password in the form. Keep blank to avoid accidental overwrite.
      initialData.smtp_password = '';
      if (initialData.email_enabled === undefined) initialData.email_enabled = 'false';
      setFormData(initialData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate before saving
    const ok = validateForm();
    if (!ok) {
      alert('Please fix validation errors before saving.');
      return;
    }
    setSaving(true);

    try {
      // Map current settings (normalized) for change detection
      const currentMap: Record<string, string> = {};
      settings.forEach((s) => {
        const nk = normalizeKeyName(s.key);
        if (ALLOWED_KEYS.has(nk)) currentMap[nk] = s.value;
      });

      // Upsert only allowed keys present in the form
      for (const [key, value] of Object.entries(formData)) {
        if (!ALLOWED_KEYS.has(key)) continue;
        // Do not overwrite existing smtp_password with empty string
        if (key === 'smtp_password') {
          const current = currentMap[key] ?? '';
          const next = value ?? '';
          if (next === '' && current !== '') continue;
        }
        if ((currentMap[key] ?? '') !== (value ?? '')) {
          await settingsAPI.update(key, { value: value ?? '' });
        }
      }
      await fetchSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoUploading(true);
      const res = await uploadAPI.uploadImage(file);
      const url = res.data.url as string;
      setFormData((prev) => ({ ...prev, site_logo_url: url }));
    } catch (err) {
      console.error('Logo upload failed', err);
      alert('Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFaviconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFaviconUploading(true);
      // Validate favicon type: allow .ico or PNG
      const nameOk = /\.ico$/i.test(file.name);
      const typeOk = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'].includes(file.type);
      if (!(nameOk || typeOk)) {
        setFieldError('favicon_url', 'Favicon must be .ico or .png');
        return;
      }
      setFieldError('favicon_url', '');
      const res = await uploadAPI.uploadImage(file);
      const url = res.data.url as string; // Expect .ico or .png
      setFormData((prev) => ({ ...prev, favicon_url: url }));
    } catch (err) {
      console.error('Favicon upload failed', err);
      alert('Favicon upload failed');
    } finally {
      setFaviconUploading(false);
    }
  };

  const settingGroups = {
    general: ['site_name', 'site_description', 'site_url', 'contact_email'],
    social: ['facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url'],
    seo: ['meta_title', 'meta_description', 'meta_keywords'],
    features: ['enable_comments', 'enable_registration', 'posts_per_page'],
    homepage: ['home_hero_title', 'home_hero_subtitle', 'featured_posts_count'],
    localization: ['timezone'],
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const emailEnabled = formData.email_enabled === 'true';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Site Name</label>
              <Input
                value={formData.site_name || ''}
                onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                placeholder="Your site name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tagline</label>
              <Input
                value={formData.site_tagline || ''}
                onChange={(e) => setFormData({ ...formData, site_tagline: e.target.value })}
                placeholder="Short tagline shown next to the logo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Site Description</label>
              <textarea
                value={formData.site_description || ''}
                onChange={(e) => setFormData({...formData, site_description: e.target.value})}
                placeholder="Brief description of your site"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Site URL</label>
              <Input
                value={formData.site_url || ''}
                onChange={(e) => setFormData({...formData, site_url: e.target.value})}
                onBlur={() => validateUrlField('site_url', formData.site_url)}
                placeholder="https://yoursite.com"
              />
              {errors.site_url && (
                <p className="text-xs text-red-500 mt-1">{errors.site_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <Input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                placeholder="contact@yoursite.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Service (SMTP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email_enabled: e.target.checked ? 'true' : 'false',
                    })
                  }
                />
                Enable Email Service
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Toggle the application-level email service used for notifications and other emails.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SMTP Host</label>
              <Input
                value={formData.smtp_host || ''}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
                disabled={!emailEnabled}
              />
              {errors.smtp_host && (
                <p className="text-xs text-red-500 mt-1">{errors.smtp_host}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Port</label>
                <Input
                  type="number"
                  value={formData.smtp_port || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                  placeholder="587"
                  min={1}
                  max={65535}
                  disabled={!emailEnabled}
                />
                {errors.smtp_port && (
                  <p className="text-xs text-red-500 mt-1">{errors.smtp_port}</p>
                )}
              </div>
              <div className="sm:col-span-2 flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.smtp_secure === 'true'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        smtp_secure: e.target.checked ? 'true' : 'false',
                      })
                    }
                    disabled={!emailEnabled}
                  />
                  Use secure connection (TLS/SSL)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Username</label>
                <Input
                  value={formData.smtp_username || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                  placeholder="you@example.com"
                  disabled={!emailEnabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Password</label>
                <Input
                  type="password"
                  value={formData.smtp_password || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  placeholder="Leave blank to keep existing"
                  disabled={!emailEnabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Name</label>
                <Input
                  value={formData.smtp_from_name || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
                  placeholder="Your Site Name"
                  disabled={!emailEnabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Email</label>
                <Input
                  type="email"
                  value={formData.smtp_from_email || ''}
                  onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
                  onBlur={() => validateEmailField('smtp_from_email', formData.smtp_from_email)}
                  placeholder="no-reply@example.com"
                  disabled={!emailEnabled}
                />
                {errors.smtp_from_email && (
                  <p className="text-xs text-red-500 mt-1">{errors.smtp_from_email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} />
                <p className="text-xs text-muted-foreground mt-1">Recommended: transparent PNG/SVG</p>
              </div>
              {formData.site_logo_url && (
                <Image
                  src={assetUrl(formData.site_logo_url)}
                  alt="Logo preview"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded border object-contain"
                />
              )}
              {logoUploading && <span className="text-sm">Uploading...</span>}
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Favicon</label>
                <input type="file" accept="image/x-icon,image/png" onChange={handleFaviconChange} />
                <p className="text-xs text-muted-foreground mt-1">ICO (32x32) or PNG</p>
                {errors.favicon_url && (
                  <p className="text-xs text-red-500 mt-1">{errors.favicon_url}</p>
                )}
              </div>
              {formData.favicon_url && (
                <Image
                  src={assetUrl(formData.favicon_url)}
                  alt="Favicon preview"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded border object-contain"
                />
              )}
              {faviconUploading && <span className="text-sm">Uploading...</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Facebook URL</label>
              <Input
                value={formData.facebook_url || ''}
                onChange={(e) => setFormData({...formData, facebook_url: e.target.value})}
                onBlur={() => validateUrlField('facebook_url', formData.facebook_url)}
                placeholder="https://facebook.com/yourpage"
              />
              {errors.facebook_url && (
                <p className="text-xs text-red-500 mt-1">{errors.facebook_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Twitter URL</label>
              <Input
                value={formData.twitter_url || ''}
                onChange={(e) => setFormData({...formData, twitter_url: e.target.value})}
                onBlur={() => validateUrlField('twitter_url', formData.twitter_url)}
                placeholder="https://twitter.com/yourhandle"
              />
              {errors.twitter_url && (
                <p className="text-xs text-red-500 mt-1">{errors.twitter_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Instagram URL</label>
              <Input
                value={formData.instagram_url || ''}
                onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                onBlur={() => validateUrlField('instagram_url', formData.instagram_url)}
                placeholder="https://instagram.com/yourhandle"
              />
              {errors.instagram_url && (
                <p className="text-xs text-red-500 mt-1">{errors.instagram_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
              <Input
                value={formData.linkedin_url || ''}
                onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                onBlur={() => validateUrlField('linkedin_url', formData.linkedin_url)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.linkedin_url && (
                <p className="text-xs text-red-500 mt-1">{errors.linkedin_url}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">GitHub URL</label>
              <Input
                value={formData.github_url || ''}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                onBlur={() => validateUrlField('github_url', formData.github_url)}
                placeholder="https://github.com/yourprofile"
              />
              {errors.github_url && (
                <p className="text-xs text-red-500 mt-1">{errors.github_url}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input
                value={formData.contact_address || ''}
                onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                placeholder="123 Main St, City, Country"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Meta Title</label>
              <Input
                value={formData.meta_title || ''}
                onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                placeholder="Default page title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meta Description</label>
              <textarea
                value={formData.meta_description || ''}
                onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                placeholder="Default meta description"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meta Keywords</label>
              <Input
                value={formData.meta_keywords || ''}
                onChange={(e) => setFormData({...formData, meta_keywords: e.target.value})}
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Home Hero Title</label>
              <Input
                value={formData.home_hero_title || ''}
                onChange={(e) => setFormData({ ...formData, home_hero_title: e.target.value })}
                placeholder="Welcome to My Blog"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Home Hero Subtitle</label>
              <textarea
                value={formData.home_hero_subtitle || ''}
                onChange={(e) => setFormData({ ...formData, home_hero_subtitle: e.target.value })}
                placeholder="Short description shown on the homepage hero section"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Featured Posts Count</label>
              <Input
                type="number"
                value={formData.featured_posts_count || '3'}
                onChange={(e) => setFormData({ ...formData, featured_posts_count: e.target.value })}
                min="0"
                max="12"
              />
              <p className="text-xs text-muted-foreground mt-1">Number of featured posts highlighted on the homepage (0 to disable).</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enable_comments === 'true'}
                  onChange={(e) => setFormData({...formData, enable_comments: e.target.checked ? 'true' : 'false'})}
                />
                Enable Comments
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enable_registration === 'true'}
                  onChange={(e) => setFormData({...formData, enable_registration: e.target.checked ? 'true' : 'false'})}
                />
                Enable User Registration
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Posts Per Page</label>
              <Input
                type="number"
                value={formData.posts_per_page || '10'}
                onChange={(e) => setFormData({...formData, posts_per_page: e.target.value})}
                min="1"
                max="50"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localization & Timezone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-2">Timezone (IANA)</label>
              <Input
                value={formData.timezone || ''}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                placeholder="e.g., UTC, America/New_York, Europe/London"
              />
              <p className="text-xs text-muted-foreground mt-1">Used for displaying and scheduling post dates.</p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
}

