'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { postsAPI } from '@/lib/api';
import { FileText, FolderOpen, Eye, File as FileIcon, Tags } from 'lucide-react';
import { Post } from '@/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    posts: 0,
    drafts: 0,
    views: 0,
    categories: 0,
    tags: 0,
  });
  const [recent, setRecent] = useState<Post[]>([]);
  const [series, setSeries] = useState<{
    postsOverTime: { month: string; count: number }[];
    popularPosts: { title: string; views: number }[];
  }>({ postsOverTime: [], popularPosts: [] });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await postsAPI.stats();
      const data = res.data;
      setCounts({
        posts: data?.counts?.posts ?? 0,
        drafts: data?.counts?.drafts ?? 0,
        views: data?.counts?.views ?? 0,
        categories: data?.counts?.categories ?? 0,
        tags: data?.counts?.tags ?? 0,
      });
      setRecent(Array.isArray(data?.recent) ? data.recent : []);
      setSeries({
        postsOverTime: Array.isArray(data?.series?.postsOverTime)
          ? data.series.postsOverTime
          : [],
        popularPosts: Array.isArray(data?.series?.popularPosts)
          ? data.series.popularPosts
          : [],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    };
  };

  const BarChart = ({
    data,
    labelKey,
    valueKey,
    height = 160,
  }: {
    data: Array<Record<string, any>>;
    labelKey: string;
    valueKey: string;
    height?: number;
  }) => {
    const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
    return (
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, idx) => {
          const val = Number(d[valueKey]) || 0;
          const barH = (val / max) * height;
          const label: string = String(d[labelKey] ?? '');
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-primary/70 rounded"
                style={{ height: `${barH}px` }}
                title={`${label}: ${val}`}
              />
              <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const HBarChart = ({
    data,
    labelKey,
    valueKey,
  }: {
    data: Array<Record<string, any>>;
    labelKey: string;
    valueKey: string;
  }) => {
    const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
    return (
      <div className="space-y-3">
        {data.map((d, idx) => {
          const val = Number(d[valueKey]) || 0;
          const pct = (val / max) * 100;
          return (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-2">{String(d[labelKey] ?? '')}</span>
                <span className="tabular-nums">{val}</span>
              </div>
              <div className="h-2 bg-muted rounded">
                <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const statCards = [
    { title: 'Total Posts', value: counts.posts, icon: FileText, color: 'text-blue-500' },
    { title: 'Drafts', value: counts.drafts, icon: FileIcon, color: 'text-yellow-500' },
    { title: 'Total Views', value: counts.views, icon: Eye, color: 'text-orange-500' },
    { title: 'Categories', value: counts.categories, icon: FolderOpen, color: 'text-green-500' },
    { title: 'Tags', value: counts.tags, icon: Tags, color: 'text-purple-500' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your content and activity</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/posts/new">
            <Button>
              Create Post
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline">Settings</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span className="rounded-md p-2 bg-muted">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recent.map((p) => (
                  <div key={p.id} className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={p.published ? 'success' : 'secondary'} className="px-1.5 py-0.5 text-[10px]">
                          {p.published ? 'Published' : 'Draft'}
                        </Badge>
                        <span>Updated {formatDate(p.updatedAt)}</span>
                      </div>
                    </div>
                    <Link href={`/admin/posts/${p.id}/edit`} className="text-sm text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/admin/posts/new"><Button>New Post</Button></Link>
            <Link href="/admin/categories"><Button variant="outline">Categories</Button></Link>
            <Link href="/admin/settings"><Button variant="ghost">Site Settings</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Posts Over Time</CardTitle>
          </CardHeader>
          <CardContent className="bg-muted/40 rounded-md p-4">
            {series.postsOverTime.length === 0 ? (
              <p className="text-muted-foreground">No data</p>
            ) : (
              <BarChart data={series.postsOverTime} labelKey="month" valueKey="count" />
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Popular Posts</CardTitle>
          </CardHeader>
          <CardContent className="bg-muted/40 rounded-md p-4">
            {series.popularPosts.length === 0 ? (
              <p className="text-muted-foreground">No data</p>
            ) : (
              <HBarChart data={series.popularPosts} labelKey="title" valueKey="views" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
