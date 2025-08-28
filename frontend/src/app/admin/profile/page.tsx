'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { profileAPI, uploadAPI, toAbsoluteUrl } from '@/lib/api';
import { Save, User, Image as ImageIcon, ShieldCheck, Bell } from 'lucide-react';

type ActivityLog = { id: string; action: string; metadata?: any; createdAt: string };
type Notifications = { emailOnComments: boolean; emailOnMentions: boolean; newsletter: boolean };

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [notifications, setNotifications] = useState<Notifications>({
    emailOnComments: true,
    emailOnMentions: true,
    newsletter: false,
  });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = useMemo(() => {
    const name = [firstName, lastName].filter(Boolean).join(' ');
    if (name) return name;
    if (email) return String(email).split('@')[0];
    return 'User';
  }, [firstName, lastName, email]);

  useEffect(() => {
    const currentUser = auth.getUser();
    if (currentUser) {
      setUser(currentUser);
    }
    // Load profile, notifications and activity
    (async () => {
      try {
        const [meRes, notifRes, activityRes] = await Promise.all([
          profileAPI.getMe(),
          profileAPI.getNotifications(),
          profileAPI.getActivity(),
        ]);
        const me = meRes.data;
        setFirstName(me.firstName || '');
        setLastName(me.lastName || '');
        setEmail(me.email || '');
        setBio(me.bio || '');
        setAvatar(me.avatar || undefined);
        setNotifications({
          emailOnComments: !!notifRes.data.emailOnComments,
          emailOnMentions: !!notifRes.data.emailOnMentions,
          newsletter: !!notifRes.data.newsletter,
        });
        setActivity(activityRes.data || []);
      } catch (e) {
        // handled by interceptor redirect on 401
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateUserCookie = (updated: any) => {
    try {
      const normalized = {
        id: updated.id,
        email: updated.email,
        name: [updated.firstName, updated.lastName].filter(Boolean).join(' ') || (updated.email ? String(updated.email).split('@')[0] : 'User'),
        role: user?.role || 'admin',
      };
      if (typeof document !== 'undefined') {
        document.cookie = `user=${encodeURIComponent(JSON.stringify(normalized))}; Path=/`;
      }
      setUser(normalized);
    } catch {}
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadAvatar(file);
      const url = res.data.url as string;
      setAvatar(url);
    } catch (err) {
      alert('Failed to upload avatar');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileAPI.updateMe({ email, firstName, lastName, bio, avatar });
      updateUserCookie(res.data);
      alert('Profile updated successfully');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await profileAPI.changePassword({ currentPassword, newPassword });
      alert('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Error updating password');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    try {
      const res = await profileAPI.updateNotifications(notifications);
      setNotifications({
        emailOnComments: !!res.data.emailOnComments,
        emailOnMentions: !!res.data.emailOnMentions,
        newsletter: !!res.data.newsletter,
      });
      alert('Notification preferences saved');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save notification preferences');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {avatar ? (
                    <Image src={toAbsoluteUrl(avatar)} alt="avatar" width={64} height={64} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Avatar</label>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                  <p className="text-xs text-muted-foreground mt-1">Auto-cropped to 256x256</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Tell us about yourself"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <Input value={user?.role || 'admin'} disabled className="bg-muted" />
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
              </div>
              <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notifications.emailOnComments} onChange={(e) => setNotifications({ ...notifications, emailOnComments: e.target.checked })} />
                Email me on new comments
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notifications.emailOnMentions} onChange={(e) => setNotifications({ ...notifications, emailOnMentions: e.target.checked })} />
                Email me on mentions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notifications.newsletter} onChange={(e) => setNotifications({ ...notifications, newsletter: e.target.checked })} />
                Subscribe to newsletter
              </label>
              <div>
                <Button type="button" onClick={handleNotificationsSave}>Save Preferences</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground"> — {new Date(a.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
