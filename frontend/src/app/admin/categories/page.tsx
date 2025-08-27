'use client';

import { useEffect, useState } from 'react';
import { categoriesAPI } from '@/lib/api';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Plus, GripVertical } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState<string>('');
  const [newColorTouched, setNewColorTouched] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingSlug, setEditingSlug] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingColor, setEditingColor] = useState<string>('');
  const [editingColorTouched, setEditingColorTouched] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop reordering
  const move = (list: Category[], from: number, to: number) => {
    const updated = [...list];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    return updated;
  };

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (targetId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const from = categories.findIndex((c) => c.id === draggingId);
    const to = categories.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }
    const prev = categories;
    const updated = move(categories, from, to);
    setCategories(updated);
    setDraggingId(null);
    try {
      await categoriesAPI.reorder(updated.map((c) => c.id));
    } catch (err) {
      console.error('Error reordering categories:', err);
      setCategories(prev);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategory.trim();
    setCreateError(null);
    if (!name) {
      setCreateError('Name is required');
      return;
    }
    const dup = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      setCreateError('Category name already exists');
      return;
    }

    try {
      const payload: any = { name };
      if (newDescription.trim()) payload.description = newDescription.trim();
      if (newColorTouched) payload.color = newColor;
      const response = await categoriesAPI.create(payload);
      setCategories([...categories, { ...response.data, postCount: 0 }]);
      setNewCategory('');
      setNewDescription('');
      setNewColor('');
      setNewColorTouched(false);
      setCreateError(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error creating category';
      setCreateError(Array.isArray(msg) ? msg[0] : String(msg));
      console.error('Error creating category:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editingName.trim();
    setEditError(null);
    if (!name) {
      setEditError('Name is required');
      return;
    }
    const dup = categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      setEditError('Category name already exists');
      return;
    }

    try {
      const payload: any = { name };
      if (editingSlug.trim()) payload.slug = editingSlug.trim();
      if (typeof editingDescription === 'string') payload.description = editingDescription.trim() || null;
      if (editingColorTouched) payload.color = editingColor;
      const response = await categoriesAPI.update(id, payload);
      setCategories(categories.map(cat => cat.id === id ? { ...response.data, postCount: cat.postCount } : cat));
      setEditingId(null);
      setEditingName('');
      setEditingSlug('');
      setEditingDescription('');
      setEditingColor('');
      setEditingColorTouched(false);
      setEditError(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error updating category';
      setEditError(Array.isArray(msg) ? msg[0] : String(msg));
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const count = categories.find(c => c.id === id)?.postCount ?? 0;
    const ok = confirm(
      count > 0
        ? `Delete this category? It is assigned to ${count} post(s). Associations will be removed; posts remain.`
        : 'Delete this category?'
    );
    if (ok) {
      try {
        await categoriesAPI.delete(id);
        setCategories(categories.filter(cat => cat.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Categories</h1>

      <Card className="mb-6 p-4">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm font-medium">Color</label>
            <Input
              type="color"
              value={newColor || '#000000'}
              onChange={(e) => { setNewColor(e.target.value); setNewColorTouched(true); }}
              className="mt-1 h-10 p-1"
              title="Pick a color (optional)"
            />
          </div>
          <div className="md:col-span-6 flex items-center gap-3">
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
            {createError && <span className="text-sm text-destructive">{createError}</span>}
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`p-4 ${draggingId === category.id ? 'opacity-50' : ''}`}
              draggable={editingId === null}
              onDragStart={onDragStart(category.id)}
              onDragOver={onDragOver}
              onDrop={onDrop(category.id)}
            >
              <div className="flex justify-between items-center">
                {editingId === category.id ? (
                  <div className="flex flex-col gap-2 flex-1">
                    {editError && <span className="text-sm text-destructive">{editError}</span>}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Slug</label>
                        <Input
                          value={editingSlug}
                          onChange={(e) => setEditingSlug(e.target.value)}
                          placeholder="example-slug"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-sm font-medium">Color</label>
                        <Input
                          type="color"
                          value={editingColor || '#000000'}
                          onChange={(e) => { setEditingColor(e.target.value); setEditingColorTouched(true); }}
                          className="mt-1 h-10 p-1"
                        />
                      </div>
                      <div className="md:col-span-6">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <div className="md:col-span-6 flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(category.id)}>
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setEditingId(null); setEditError(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      {category.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full border"
                          style={{ backgroundColor: category.color || 'transparent' }}
                          title={category.color || ''}
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.postCount ?? 0} posts
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                          setEditingSlug(category.slug);
                          setEditingDescription(category.description || '');
                          setEditingColor(category.color || '#000000');
                          setEditingColorTouched(false);
                          setEditError(null);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
