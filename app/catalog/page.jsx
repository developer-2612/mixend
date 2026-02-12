'use client';
import { useEffect, useMemo, useState } from 'react';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Loader from '../components/common/Loader.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faBoxOpen,
  faPenToSquare,
  faTrashCan,
  faCopy,
  faToggleOn,
  faToggleOff,
  faMagnifyingGlass,
  faTags,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

const DEFAULT_SERVICE_PROMPT =
  'Please share your service details (preferred date/time, requirements, and any specific concerns).';
const DEFAULT_PRODUCT_PROMPT =
  'Please share product details (variant/size, quantity, and any preferences).';

const buildEmptyForm = (type = 'service') => ({
  item_type: type,
  name: '',
  category: '',
  price_label: '',
  duration_minutes: '',
  description: '',
  details_prompt: type === 'service' ? DEFAULT_SERVICE_PROMPT : DEFAULT_PRODUCT_PROMPT,
  keywords: '',
  is_active: true,
  sort_order: 0,
  is_bookable: false,
});

const formatKeywords = (keywords) => {
  if (Array.isArray(keywords)) return keywords.join(', ');
  return keywords || '';
};

const parseNumber = (value, fallback = null) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    category: 'all',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(buildEmptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async ({ bustCache = false } = {}) => {
    setLoading(true);
    setError('');
    try {
      const cacheKey = bustCache ? `&ts=${Date.now()}` : '';
      const response = await fetch(`/api/catalog?limit=500${cacheKey}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load catalog');
      }
      setItems(data.data || []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set();
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.type !== 'all' && item.item_type !== filters.type) return false;
      if (filters.status !== 'all') {
        const isActive = Boolean(item.is_active);
        if (filters.status === 'active' && !isActive) return false;
        if (filters.status === 'inactive' && isActive) return false;
      }
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (search) {
        const haystack = `${item.name} ${item.category || ''} ${item.description || ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((item) => item.is_active).length;
    const services = items.filter((item) => item.item_type === 'service').length;
    const products = items.filter((item) => item.item_type === 'product').length;
    return { total, active, services, products };
  }, [items]);

  const openCreateModal = (type) => {
    setEditingItem(null);
    setForm(buildEmptyForm(type));
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      item_type: item.item_type,
      name: item.name || '',
      category: item.category || '',
      price_label: item.price_label || '',
      duration_minutes: item.duration_minutes ?? '',
      description: item.description || '',
      details_prompt: item.details_prompt || (item.item_type === 'service' ? DEFAULT_SERVICE_PROMPT : DEFAULT_PRODUCT_PROMPT),
      keywords: formatKeywords(item.keywords),
      is_active: Boolean(item.is_active),
      sort_order: item.sort_order ?? 0,
      is_bookable: Boolean(item.is_bookable),
    });
    setShowModal(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    const payload = {
      item_type: form.item_type,
      name: form.name.trim(),
      category: form.category.trim(),
      price_label: form.price_label.trim(),
      duration_minutes:
        form.item_type === 'service' ? parseNumber(form.duration_minutes, null) : null,
      description: form.description.trim(),
      details_prompt: form.details_prompt.trim(),
      keywords: form.keywords,
      is_active: Boolean(form.is_active),
      sort_order: parseNumber(form.sort_order, 0),
      is_bookable: form.item_type === 'service' ? Boolean(form.is_bookable) : false,
    };

    try {
      const response = await fetch(
        editingItem ? `/api/catalog/${editingItem.id}` : '/api/catalog',
        {
          method: editingItem ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save item');
      }
      setShowModal(false);
      setEditingItem(null);
      setNotice(editingItem ? 'Item updated.' : 'Item created.');
      await fetchItems({ bustCache: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const response = await fetch(`/api/catalog/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? data.data : entry))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDuplicate = async (item) => {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          item_type: item.item_type,
          name: `${item.name} (Copy)`,
          category: item.category || '',
          price_label: item.price_label || '',
          duration_minutes: item.duration_minutes ?? null,
          description: item.description || '',
          details_prompt: item.details_prompt || '',
          keywords: item.keywords || '',
          is_active: false,
          sort_order: item.sort_order ?? 0,
          is_bookable: Boolean(item.is_bookable),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate item');
      }
      setNotice('Item duplicated.');
      await fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!item?.id) {
      setError('Unable to delete item: missing id.');
      return;
    }
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/catalog/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data.error || 'Failed to delete item');
      }
      setNotice('Item deleted.');
      setItems((prev) => prev.filter((entry) => String(entry.id) !== String(deleteTarget.id)));
      await fetchItems({ bustCache: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const buildPreviewLines = (type) => {
    const activeItems = items
      .filter((item) => item.item_type === type && item.is_active)
      .sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.name).localeCompare(String(b.name));
      });

    if (activeItems.length === 0) {
      return ['No active items yet.'];
    }

    return activeItems.slice(0, 6).map((item, idx) => {
      const parts = [`${idx + 1}. ${item.name}`];
      if (item.price_label) parts.push(`(${item.price_label})`);
      if (item.duration_minutes && type === 'service') {
        parts.push(`${item.duration_minutes} min`);
      }
      return parts.join(' ');
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="lg" text="Loading products and services..." />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="catalog-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-aa-dark-blue mb-2">Products & Services</h1>
          <p className="text-aa-gray">Manage what WhatsApp users see when they ask about offerings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} />}
            onClick={() => openCreateModal('service')}
          >
            Add Product / Service
          </Button>
        </div>
      </div>

      {(error || notice) && (
        <div className="flex flex-col gap-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {notice}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold text-aa-gray uppercase mb-1">Total Items</p>
          <p className="text-2xl font-bold text-aa-dark-blue">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-aa-gray uppercase mb-1">Active</p>
          <p className="text-2xl font-bold text-aa-dark-blue">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-aa-gray uppercase mb-1">Services</p>
          <p className="text-2xl font-bold text-aa-dark-blue">{stats.services}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-aa-gray uppercase mb-1">Products</p>
          <p className="text-2xl font-bold text-aa-dark-blue">{stats.products}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <Input
              label="Search"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search by name, category, or description"
              icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold text-aa-gray uppercase mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="service">Services</option>
                <option value="product">Products</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-aa-gray uppercase mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-aa-gray uppercase mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
              >
                <option value="all">All</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {filteredItems.length === 0 ? (
            <Card className="p-4 sm:p-6 text-center">
              <div className="w-14 h-14 bg-aa-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faBoxOpen} className="text-aa-orange" style={{ fontSize: 22 }} />
              </div>
              <h3 className="text-lg font-bold text-aa-dark-blue">No items found</h3>
              <p className="text-aa-gray text-sm mt-2">Add your first product or service to start building the WhatsApp menu.</p>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => openCreateModal('service')}>Add Service</Button>
                <Button variant="primary" onClick={() => openCreateModal('product')}>Add Product</Button>
              </div>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="p-5" data-testid={`catalog-item-${item.id}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-aa-orange/10 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faBoxOpen} className="text-aa-orange" style={{ fontSize: 18 }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-aa-dark-blue">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={item.item_type === 'service' ? 'blue' : 'orange'}>
                            {item.item_type === 'service' ? 'Service' : 'Product'}
                          </Badge>
                          <Badge variant={item.is_active ? 'green' : 'default'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {item.category && <Badge variant="default">{item.category}</Badge>}
                          {item.is_bookable && <Badge variant="yellow">Bookable</Badge>}
                        </div>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-sm text-aa-gray mt-3 bg-gray-50 p-3 rounded-lg">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-aa-gray mt-3">
                      {item.price_label && (
                        <span className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faTags} /> {item.price_label}
                        </span>
                      )}
                      {item.item_type === 'service' && item.duration_minutes && (
                        <span className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faClock} /> {item.duration_minutes} min
                        </span>
                      )}
                      {item.keywords && item.keywords.length > 0 && (
                        <span className="flex items-center gap-2">
                          Keywords: {item.keywords.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span className="text-xs text-aa-gray">Order: {item.sort_order ?? 0}</span>
                    <div className="flex items-center gap-3 text-sm font-semibold">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-aa-dark-blue hover:underline"
                        onClick={() => openEditModal(item)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-aa-orange hover:underline"
                        onClick={() => handleDuplicate(item)}
                        disabled={saving}
                      >
                        <FontAwesomeIcon icon={faCopy} style={{ fontSize: 14 }} />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-red-600 hover:underline"
                        onClick={() => handleDelete(item)}
                        disabled={saving}
                      >
                        <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: 14 }} />
                        Delete
                      </button>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-semibold text-aa-dark-blue mt-2"
                      onClick={() => handleToggleActive(item)}
                    >
                      <FontAwesomeIcon
                        icon={item.is_active ? faToggleOn : faToggleOff}
                        style={{ fontSize: 22 }}
                        className={item.is_active ? 'text-green-500' : 'text-gray-400'}
                      />
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-lg font-bold text-aa-dark-blue mb-2">WhatsApp Preview</h3>
            <p className="text-sm text-aa-gray mb-4">Top items that will appear in WhatsApp menus.</p>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-aa-gray uppercase mb-2">Services</p>
                <ul className="text-sm text-aa-text-dark space-y-1">
                  {buildPreviewLines('service').map((line, idx) => (
                    <li key={`service-preview-${idx}`}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-aa-gray uppercase mb-2">Products</p>
                <ul className="text-sm text-aa-text-dark space-y-1">
                  {buildPreviewLines('product').map((line, idx) => (
                    <li key={`product-preview-${idx}`}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
        size="xl"
      >
        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-aa-gray">Item type</p>
                    <p className="text-lg font-semibold text-aa-text-dark">
                      Choose how this appears in WhatsApp
                    </p>
                  </div>
                  <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          item_type: 'service',
                          details_prompt: DEFAULT_SERVICE_PROMPT,
                        }))
                      }
                      disabled={Boolean(editingItem)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                        form.item_type === 'service'
                          ? 'bg-aa-dark-blue text-white'
                          : 'text-aa-gray hover:text-aa-dark-blue'
                      } ${editingItem ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      Service
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          item_type: 'product',
                          details_prompt: DEFAULT_PRODUCT_PROMPT,
                        }))
                      }
                      disabled={Boolean(editingItem)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                        form.item_type === 'product'
                          ? 'bg-aa-dark-blue text-white'
                          : 'text-aa-gray hover:text-aa-dark-blue'
                      } ${editingItem ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      Product
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g., Personal Astrology Consultation"
                  required
                />
                <Input
                  label="Category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="e.g., Consultations"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Price Label"
                  value={form.price_label}
                  onChange={(event) => setForm((prev) => ({ ...prev, price_label: event.target.value }))}
                  placeholder="e.g., INR 999 / session"
                />
                {form.item_type === 'service' ? (
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    value={form.duration_minutes}
                    onChange={(event) => setForm((prev) => ({ ...prev, duration_minutes: event.target.value }))}
                    placeholder="e.g., 45"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-aa-gray">
                    Products do not need duration settings.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-aa-text-dark mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-aa-text-dark outline-none focus:border-aa-orange focus:ring-2 focus:ring-aa-orange/20"
                  rows="3"
                  placeholder="Short summary for your team"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-aa-text-dark mb-2">WhatsApp Details Prompt</label>
                <textarea
                  value={form.details_prompt}
                  onChange={(event) => setForm((prev) => ({ ...prev, details_prompt: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-aa-text-dark outline-none focus:border-aa-orange focus:ring-2 focus:ring-aa-orange/20"
                  rows="4"
                  placeholder="What should the bot ask next?"
                />
                <p className="text-xs text-aa-gray mt-2">
                  This text is sent when a user selects this item on WhatsApp.
                </p>
              </div>

              <Input
                label="Keywords (comma separated)"
                value={form.keywords}
                onChange={(event) => setForm((prev) => ({ ...prev, keywords: event.target.value }))}
                placeholder="e.g., kundli, birth chart, horoscope"
              />
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-aa-text-dark">Publishing</p>
                <p className="text-xs text-aa-gray mt-1">Control visibility and ordering.</p>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-aa-text-dark">Active on WhatsApp</p>
                    <p className="text-xs text-aa-gray">Visible in the catalog list.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aa-orange"></div>
                  </label>
                </div>

                {form.item_type === 'service' && (
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-aa-text-dark">Bookable</p>
                      <p className="text-xs text-aa-gray">Allow customers to pick slots.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="bookable"
                        type="checkbox"
                        checked={form.is_bookable}
                        onChange={(event) => setForm((prev) => ({ ...prev, is_bookable: event.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aa-orange"></div>
                    </label>
                  </div>
                )}

                <div className="mt-4">
                  <Input
                    label="Sort Order"
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-aa-text-dark">WhatsApp preview</p>
                <p className="text-xs text-aa-gray">A quick look at what customers see.</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-aa-text-dark truncate">
                      {form.name || 'Item name'}
                    </span>
                    <span className="text-aa-gray">{form.price_label || 'Price label'}</span>
                  </div>
                  <p className="text-xs text-aa-gray">Category: {form.category || '—'}</p>
                  {form.item_type === 'service' && form.duration_minutes && (
                    <p className="text-xs text-aa-gray">Duration: {form.duration_minutes} min</p>
                  )}
                  <p className="text-xs text-aa-gray">
                    Status: {form.is_active ? 'Active' : 'Hidden'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete item?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-aa-text-dark">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteTarget?.name || 'this item'}</span>? This action
            cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={confirmDelete}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Yes, delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
