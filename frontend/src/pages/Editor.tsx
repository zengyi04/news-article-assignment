import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ArticleFormData, Article } from '../types';
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  title: yup.string().required('Article title is mandatory'),
  summary: yup.string().min(20, 'Provide a slightly more detailed summary (min 20 chars)').required('Summary is required'),
  date: yup.string().required('Archive date is required'),
  publisher: yup.string().required('Attribution is required'),
  type: yup.string().oneOf(['standard', 'website', 'pdf', 'doc']).required(),
  imageUrl: yup.string().optional(),
  sourceUrl: yup.string().when('type', {
    is: (val: string) => val !== 'standard',
    then: (schema) => schema.required('External articles require a valid source'),
    otherwise: (schema) => schema.optional()
  })
}).required();

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ArticleFormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      title: '',
      summary: '',
      date: new Date().toISOString().split('T')[0],
      publisher: '',
      type: 'standard',
      imageUrl: '',
      sourceUrl: ''
    }
  });

  const articleType = watch('type');
  const imageUrl = watch('imageUrl');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'sourceUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setValue(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setValue('imageUrl', reader.result as string);
            toast.info('Image pasted from clipboard');
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  useEffect(() => {
    if (id) {
      const fetchArticle = async () => {
        setFetching(true);
        try {
          const docRef = doc(db, 'articles', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Article;
            reset({
              title: data.title,
              summary: data.summary,
              date: data.date,
              publisher: data.publisher,
              type: data.type || 'standard',
              imageUrl: data.imageUrl || '',
              sourceUrl: data.sourceUrl || ''
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `articles/${id}`);
        } finally {
          setFetching(false);
        }
      };
      fetchArticle();
    }
  }, [id, reset]);

  const onSubmit = async (data: ArticleFormData) => {
    setLoading(true);
    const toastId = toast.info(id ? 'Updating archive...' : 'Publishing insight...', { autoClose: false });
    
    try {
      // Clean and validate data before sending to Firestore
      const cleanedData = {
        ...data,
        // Validate and clean image URL
        imageUrl: validateAndCleanUrl(data.imageUrl),
        // Validate and clean source URL
        sourceUrl: validateAndCleanUrl(data.sourceUrl)
      };

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 60000); // 60 second timeout
      });

      console.log('Starting Firebase operation...', { id: !!id, hasData: !!data });

      let operation;
      if (id) {
        const docRef = doc(db, 'articles', id);
        operation = updateDoc(docRef, {
          ...cleanedData,
          updatedAt: Date.now()
        });
      } else {
        operation = addDoc(collection(db, 'articles'), {
          ...cleanedData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPinned: false
        });
      }

      // Race between operation and timeout
      try {
        const result = await Promise.race([operation, timeoutPromise]);
        console.log('Firebase operation completed successfully:', result);
        
        if (id) {
          toast.update(toastId, { render: 'Archive successfully updated', type: 'success', autoClose: 2000 });
        } else {
          toast.update(toastId, { render: 'New insight published successfully', type: 'success', autoClose: 2000 });
          reset();
        }
        
        // Navigate immediately after successful operation
        navigate('/dashboard');
      } catch (raceError) {
        // Re-throw the error to be handled by the outer catch block
        throw raceError;
      }
    } catch (error) {
      toast.dismiss(toastId);
      
      // Handle specific errors
      if (error.message === 'Operation timed out') {
        toast.error('Publishing timed out. Please check your connection and try again.');
      } else {
        handleFirestoreError(error, OperationType.WRITE, id ? `articles/${id}` : 'articles');
      }
      
      console.error('Publishing error:', error);
    } finally {
      setLoading(false);
    }
  };

  // URL validation and cleaning function
  const validateAndCleanUrl = (url?: string): string => {
    if (!url) return '';
    
    // Handle data URLs (base64 encoded images)
    if (url.startsWith('data:')) {
      // More thorough data URL validation
      const dataUrlRegex = /^data:(image\/[a-zA-Z]+|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/;
      if (dataUrlRegex.test(url)) {
        return url;
      } else {
        console.warn('Invalid data URL format, removing:', url.substring(0, 50) + '...');
        return '';
      }
    }
    
    // Handle HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return url;
      } catch {
        console.warn('Invalid URL format, removing:', url);
        return '';
      }
    }
    
    // Handle relative URLs or other formats - remove them
    console.warn('Unsupported URL format, removing:', url);
    return '';
  };

  // Manual reset function for stuck states
  const handleManualReset = () => {
    setLoading(false);
    toast.dismiss();
    toast.info('Form reset. You can try publishing again.');
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-inherit">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest opacity-40">Decrypting Archive...</p>
      </div>
    );
  }

  return (
    <div id="editor-page" className="max-w-4xl">
      <header className="mb-12">
        <button 
          id="back-button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO ARCHIVE
        </button>
        <h2 className="text-6xl font-black tracking-tighter text-inherit mb-4 uppercase">
          {id ? 'Refine' : 'Compose'}
        </h2>
        <p className="text-lg font-medium opacity-50">
          {id ? 'Polishing your contribution to the digital history.' : 'Drafting a new narrative for the modern era.'}
        </p>
      </header>

      <form 
        id="article-form" 
        onSubmit={handleSubmit(onSubmit)} 
        onPaste={handlePaste}
        className="glass p-8 lg:p-12 rounded-[40px] space-y-10 shadow-2xl shadow-black/[0.05]"
      >
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-inherit">Headline</label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="What happened today?"
                className={cn(
                  "w-full px-6 py-5 rounded-2xl bg-white/20 dark:bg-white/5 border-2 transition-all duration-300 outline-none focus:bg-white/50 dark:focus:bg-white/10 focus:border-[#DAFB37] text-xl font-bold tracking-tight text-inherit",
                  errors.title ? "border-red-500/50" : "border-white/20 dark:border-white/10"
                )}
              />
            )}
          />
          {errors.title && <p className="text-xs font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-inherit">Archive Date</label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className={cn(
                    "w-full px-6 py-5 rounded-2xl bg-white/10 dark:bg-white/5 border-2 transition-all duration-300 outline-none focus:bg-white/20 dark:focus:bg-white/10 focus:border-[#DAFB37] text-sm font-bold text-inherit",
                    errors.date ? "border-red-500/50" : "border-white/10 dark:border-white/5"
                  )}
                />
              )}
            />
            {errors.date && <p className="text-xs font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider">{errors.date.message}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-inherit">Source / Attribution</label>
            <Controller
              name="publisher"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="Publisher Name"
                  className={cn(
                    "w-full px-6 py-5 rounded-2xl bg-white/10 dark:bg-white/5 border-2 transition-all duration-300 outline-none focus:bg-white/20 dark:focus:bg-white/10 focus:border-[#DAFB37] text-sm font-bold text-inherit",
                    errors.publisher ? "border-red-500/50" : "border-white/10 dark:border-white/5"
                  )}
                />
              )}
            />
            {errors.publisher && <p className="text-xs font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider">{errors.publisher.message}</p>}
          </div>
        </div>

        <div className="p-8 lg:p-10 rounded-[32px] bg-white/5 space-y-10 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Content Type</label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-6 py-5 rounded-2xl glass border-2 border-white/5 transition-all duration-300 outline-none focus:border-[#DAFB37] text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="standard">Standard Article</option>
                    <option value="website">External Website Link</option>
                    <option value="pdf">PDF Document File</option>
                    <option value="doc">Google/MS Doc Link</option>
                  </select>
                )}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Visual Cover (Optional)</label>
              <div className="flex gap-4">
                <Controller
                  name="imageUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Paste Image URL or File..."
                      className={cn(
                        "flex-1 px-6 py-5 rounded-2xl glass border-2 transition-all duration-300 outline-none focus:border-[#DAFB37] text-xs font-bold",
                        errors.imageUrl ? "border-red-500/50" : "border-white/5"
                      )}
                    />
                  )}
                />
                <label className="shrink-0 p-5 glass rounded-2xl cursor-pointer hover:bg-[#DAFB37] hover:text-black transition-all">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'imageUrl')} />
                  <Plus className="w-5 h-5" />
                </label>
              </div>
              {imageUrl && (
                <div className="mt-2 relative group w-20 h-20 rounded-xl overflow-hidden shadow-md">
                  <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => setValue('imageUrl', '')}
                    className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {articleType !== 'standard' && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-inherit">
                {articleType === 'website' ? 'Target Website URL' : 'Document Source URL / File'}
              </label>
              <div className="flex gap-4">
                <Controller
                  name="sourceUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder={articleType === 'website' ? "https://..." : "URL or upload file..."}
                      className={cn(
                        "flex-1 px-6 py-5 rounded-2xl glass border-2 transition-all duration-300 outline-none focus:border-[#DAFB37] text-sm font-bold text-inherit",
                        errors.sourceUrl ? "border-red-500/50" : "border-white/5"
                      )}
                    />
                  )}
                />
                {articleType !== 'website' && (
                  <label className="shrink-0 p-5 glass rounded-2xl cursor-pointer hover:bg-[#DAFB37] hover:text-black transition-all">
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'sourceUrl')} />
                    <Plus className="w-5 h-5" />
                  </label>
                )}
              </div>
              {errors.sourceUrl && <p className="text-xs font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider">{errors.sourceUrl.message}</p>}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Article Narrative</label>
          <Controller
            name="summary"
            control={control}
            render={({ field }) => (
              <div className="rich-text-editor overflow-hidden rounded-2xl border-2 border-white/20 transition-all focus-within:border-[#DAFB37]">
                <ReactQuill 
                  theme="snow"
                  value={field.value}
                  onChange={field.onChange}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{'list': 'ordered'}, {'list': 'bullet'}],
                      ['link', 'clean']
                    ],
                  }}
                  className="bg-white/10"
                />
              </div>
            )}
          />
          {errors.summary && <p className="text-xs font-bold text-red-500 mt-2 ml-1 uppercase tracking-wider">{errors.summary.message}</p>}
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center gap-4">
          <button
            id="submit-button"
            type="submit"
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-12 py-5 rounded-2xl bg-[#1A1A1A] text-[#DAFB37] font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-black/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {id ? 'Update Entry' : 'Verify & Publish'}
          </button>
          
          {loading && (
            <button
              type="button"
              onClick={handleManualReset}
              className="w-full md:w-auto px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 transition-all"
            >
              Cancel & Reset
            </button>
          )}
          
          {!id && !loading && (
             <button
              id="reset-button"
              type="button"
              onClick={() => reset()}
              className="w-full md:w-auto px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:bg-white/10 transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
