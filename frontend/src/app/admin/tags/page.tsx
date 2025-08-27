'use client';

import { useEffect, useState } from 'react';
import { tagsAPI } from '@/lib/api';
import { Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Plus, Tag as TagIcon, GitMerge, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string | ''>('');
  const [actionLoading, setActionLoading] = useState<{ merge: boolean; cleanup: boolean }>({ merge: false, cleanup: false });

  useEffect(() => {
    fetchTags();
  }, []);

  // Refetch when search changes (simple debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchTags(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTags = async (q?: string) => {
    try {
      const response = await tagsAPI.getAll(q ? { q } : undefined);
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      const response = await tagsAPI.create({ name: newTag });
      setTags([...tags, response.data]);
      setNewTag('');
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const response = await tagsAPI.update(id, { name: editingName });
      setTags(tags.map(tag => tag.id === id ? response.data : tag));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      try {
        await tagsAPI.delete(id);
        setTags(tags.filter(tag => tag.id !== id));
        setSelected((prev) => prev.filter((x) => x !== id));
      } catch (error) {
        console.error('Error deleting tag:', error);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleMerge = async () => {
    const ids = selected;
    if (ids.length < 2) return;
    const targetId = mergeTargetId || ids[0];
    const sourceIds = ids.filter((x) => x !== targetId);
    if (sourceIds.length === 0) return;
    if (!confirm(`Merge ${sourceIds.length} tag(s) into selected target? This cannot be undone.`)) return;
    try {
      setActionLoading((s) => ({ ...s, merge: true }));
      await tagsAPI.merge(sourceIds, targetId);
      setSelected([]);
      setMergeTargetId('');
      await fetchTags(search);
    } catch (error) {
      console.error('Error merging tags:', error);
    } finally {
      setActionLoading((s) => ({ ...s, merge: false }));
    }
  };

  const handleCleanupUnused = async () => {
    if (!confirm('Delete all tags that are not used by any posts?')) return;
    try {
      setActionLoading((s) => ({ ...s, cleanup: true }));
      await tagsAPI.cleanupUnused();
      await fetchTags(search);
    } catch (error) {
      console.error('Error cleaning up unused tags:', error);
    } finally {
      setActionLoading((s) => ({ ...s, cleanup: false }));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Tags</h1>

      <div className="mb-6 grid grid-cols-1 gap-4">
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tags by name or slug"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSearch('')}>Clear</Button>
              <Button variant="destructive" onClick={handleCleanupUnused} disabled={actionLoading.cleanup}>
                <Trash2 className="mr-2 h-4 w-4" /> Cleanup Unused
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag name"
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" /> Add Tag
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm text-muted-foreground">Selected: {selected.length}</div>
            <div className="flex gap-2 items-center flex-1">
              <select
                className="border rounded px-2 py-1 w-full md:w-auto"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                disabled={selected.length < 2}
              >
                <option value="">Choose target tag</option>
                {tags
                  .filter((t) => selected.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <Button onClick={handleMerge} disabled={selected.length < 2 || actionLoading.merge}>
                <GitMerge className="mr-2 h-4 w-4" /> Merge Selected
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <Card key={tag.id} className="p-4">
              {editingId === tag.id ? (
                <div className="flex gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleUpdate(tag.id)}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(tag.id)}
                    onChange={() => toggleSelect(tag.id)}
                    className="h-4 w-4"
                    aria-label={`Select ${tag.name}`}
                  />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof tag.postCount === 'number' && (
                        <Badge variant="secondary" title="Posts using this tag">
                          {tag.postCount} post{tag.postCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditingName(tag.name);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
