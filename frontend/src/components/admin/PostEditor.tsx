'use client';

import { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Code as CodeIcon,
  Code2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { uploadAPI } from '@/lib/api';
import { useSettings } from '@/components/public/SettingsContext';

interface PostEditorProps {
  content: string;
  onChange: (content: string) => void;
}

// Create a lightweight lowlight instance with common languages
const lowlight = createLowlight(common);

function PostEditorInner({ content, onChange }: PostEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // We'll handle this with our custom code block
      }),
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      CharacterCount.configure({
        // no hard limit; we only display
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none',
        'aria-label': 'Post content editor',
        tabIndex: '0',
        spellCheck: 'true',
      },
      handleDOMEvents: {
        mousedown: (view) => {
          if (!view.hasFocus()) view.focus();
          return false;
        },
      },
    },
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null);
  const { assetUrl } = useSettings();

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      const res = await uploadAPI.uploadImage(file);
      const url: string = res.data?.url || '';
      const fullUrl = assetUrl(url);
      if (editor) {
        const alt = window.prompt('Image alt text (optional)', '') || '';
        editor.chain().focus().setImage({ src: fullUrl, alt }).run();
      }
    } catch (err) {
      console.error('Image upload failed', err);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setUploadError(
        offline 
          ? 'You appear to be offline. Please check your connection and try again.'
          : 'Failed to upload image. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Focus editor on mount
  useEffect(() => {
    if (editor) editor.commands.focus('end');
  }, [editor]);

  // Handle fullscreen mode
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
      editor?.commands.focus('end');
      
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setFullscreen(false);
      };
      
      window.addEventListener('keydown', onKey);
      setTimeout(() => editor?.commands.focus('end'), 0);
      const btn = fullscreenBtnRef.current;
      
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
        btn?.focus();
      };
    }
  }, [fullscreen, editor]);

  // Handle mobile menu
  useEffect(() => {
    if (!moreOpen) return;
    
    const btn = moreBtnRef.current;
    const onDocClick = (e: MouseEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    setTimeout(() => firstMenuItemRef.current?.focus(), 0);
    
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      btn?.focus();
    };
  }, [moreOpen]);

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div 
      className={`${fullscreen ? 'fixed inset-0 z-50 bg-background/95 backdrop-blur border-0 rounded-none flex flex-col' : 'border rounded-lg'}`} 
      onMouseDown={() => editor.commands.focus()}
    >
      <div
        className="border-b p-2 flex flex-wrap items-center gap-1 relative"
        onMouseDown={(e) => e.stopPropagation()}
        ref={toolbarRef}
        role="toolbar"
        aria-label="Editor toolbar"
      >
        {/* Basic formatting buttons */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
          aria-label="Bold"
          aria-pressed={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
          aria-label="Italic"
          aria-pressed={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
          aria-label="Heading 1"
          aria-pressed={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
          aria-label="Heading 2"
          aria-pressed={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          aria-label="Bullet list"
          aria-pressed={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          aria-label="Ordered list"
          aria-pressed={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Block elements */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-accent' : ''}
          aria-label="Blockquote"
          aria-pressed={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'bg-accent' : ''}
          aria-label="Code block"
          aria-pressed={editor.isActive('codeBlock')}
        >
          <Code2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Links and images */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={addLink}
          className={editor.isActive('link') ? 'bg-accent' : ''}
          aria-label="Add link"
          aria-pressed={editor.isActive('link')}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={uploading}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={onUploadClick}
          aria-label="Insert image"
        >
          {uploading ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelected}
            accept="image/*"
            className="hidden"
            aria-hidden="true"
          />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            ref={fullscreenBtnRef}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Mobile menu button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          ref={moreBtnRef}
          className="sm:hidden"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => setMoreOpen(!moreOpen)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-label="More formatting options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {/* Mobile menu */}
        {moreOpen && (
          <div
            className="absolute left-2 right-2 top-full z-50 mt-2 border bg-background rounded-md shadow p-2 grid grid-cols-6 gap-1 sm:hidden"
            role="menu"
            aria-label="More formatting options"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              ref={firstMenuItemRef}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleCode().run(); setMoreOpen(false); }}
              className={editor.isActive('code') ? 'bg-accent' : ''}
              aria-label="Inline code"
              role="menuitem"
            >
              <CodeIcon className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setMoreOpen(false); }}
              className={editor.isActive('codeBlock') ? 'bg-accent' : ''}
              aria-label="Code block"
              role="menuitem"
            >
              <Code2 className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setMoreOpen(false); }}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
              aria-label="Heading 1"
              role="menuitem"
            >
              <Heading1 className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setMoreOpen(false); }}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
              aria-label="Heading 2"
              role="menuitem"
            >
              <Heading2 className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleBulletList().run(); setMoreOpen(false); }}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
              aria-label="Bullet list"
              role="menuitem"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleOrderedList().run(); setMoreOpen(false); }}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
              aria-label="Ordered list"
              role="menuitem"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => { editor.chain().focus().toggleBlockquote().run(); setMoreOpen(false); }}
              className={editor.isActive('blockquote') ? 'bg-accent' : ''}
              aria-label="Blockquote"
              role="menuitem"
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <EditorContent 
        editor={editor}
        className={`flex-1 overflow-auto ${fullscreen ? 'h-[calc(100vh-56px)]' : ''}`}
      />

      {uploadError && (
        <div className="border-t p-2 bg-destructive/10 text-destructive-foreground text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Words: {editor.storage.characterCount.words?.() || 0}</span>
        <span>Characters: {editor.storage.characterCount.characters?.() || 0}</span>
      </div>
    </div>
  );
}

export default function PostEditor(props: PostEditorProps) {
  // Force a remount across HMR changes to avoid lingering hook order state
  return <PostEditorInner key="v2" {...props} />;
}
