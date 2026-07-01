import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { openDarazDocument, extractDarazActionMessage } from '../utils/darazDocument';
import BulkActionBar from '../components/orders/BulkActionBar.jsx';
import FilterDrawer from '../components/orders/FilterDrawer.jsx';
import ImagePreview from '../components/orders/ImagePreview.jsx';
import OrderTable from '../components/orders/OrderTable.jsx';
import OrderToolbar from '../components/orders/OrderToolbar.jsx';
import {
  canDarazPack,
  canDarazPrintAwb,
  canDarazReady,
  countByStatus,
  matchesStatus,
  normalize,
  orderSearchText,
} from '../utils/orderHelpers';

const blankFilters = {
  marketplace: 'all',
  account: '',
  country: '',
  payment: '',
  dateFrom: '',
  dateTo: '',
  hasWaybill: 'all',
  minTotal: '',
  maxTotal: '',
};

function filterOrders(orders, filters, query, status) {
  const q = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (!matchesStatus(order, status)) return false;
    if (q && !orderSearchText(order).includes(q)) return false;

    if (
      filters.marketplace !== 'all' &&
      normalize(order.source) !== normalize(filters.marketplace)
    ) {
      return false;
    }

    if (
      filters.account &&
      !normalize(order.account_name || order.account_code).includes(
        normalize(filters.account)
      )
    ) {
      return false;
    }

    if (
      filters.country &&
      !orderSearchText(order).includes(normalize(filters.country))
    ) {
      return false;
    }

    if (
      filters.payment &&
      !normalize(order.payment_method).includes(normalize(filters.payment))
    ) {
      return false;
    }

    if (
      filters.hasWaybill === 'yes' &&
      !(order.waybill_id || order.tracking_number)
    ) {
      return false;
    }

    if (
      filters.hasWaybill === 'no' &&
      (order.waybill_id || order.tracking_number)
    ) {
      return false;
    }

    const total = Number(order.grand_total || 0);

    if (filters.minTotal && total < Number(filters.minTotal)) return false;
    if (filters.maxTotal && total > Number(filters.maxTotal)) return false;

    const orderDate = order.order_date ? new Date(order.order_date) : null;

    if (filters.dateFrom && orderDate && orderDate < new Date(filters.dateFrom)) {
      return false;
    }

    if (filters.dateTo && orderDate) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);

      if (orderDate > dateTo) return false;
    }

    return true;
  });
}

function activeFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (!value) return false;
    if (key === 'marketplace' && value === 'all') return false;
    if (key === 'hasWaybill' && value === 'all') return false;
    return true;
  }).length;
}

export default function OrdersPage() {
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [options, setOptions] = useState({});
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState(blankFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const [ordersResult, optionsResult] = await Promise.all([
        orderApi.listOrders({ limit: 500 }),
        orderApi.filterOptions().catch(() => ({ data: {} })),
      ]);

      setOrders(ordersResult.data?.orders || ordersResult.data || []);
      setOptions(optionsResult.data || {});
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const searchValue = searchParams.get('search') || '';
    setQuery(searchValue);
  }, [searchParams]);

  useEffect(() => {
    const handleGlobalSearch = (event) => {
      setQuery(event.detail?.search || '');
    };

    window.addEventListener('global-order-search', handleGlobalSearch);

    return () => {
      window.removeEventListener('global-order-search', handleGlobalSearch);
    };
  }, []);

  const counts = useMemo(() => countByStatus(orders), [orders]);

  const visibleOrders = useMemo(
    () => filterOrders(orders, filters, query, status),
    [orders, filters, query, status]
  );

  const selectedOrders = useMemo(
    () =>
      visibleOrders.filter((order) =>
        selectedIds.has(`${order.source}:${order.source_order_id}`)
      ),
    [visibleOrders, selectedIds]
  );

  const selectedDaraz = useMemo(
    () => selectedOrders.filter((order) => order.source === 'daraz'),
    [selectedOrders]
  );

  function toggleOrder(order) {
    const key = `${order.source}:${order.source_order_id}`;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function toggleAll(checked, rows) {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      rows.forEach((order) => {
        const key = `${order.source}:${order.source_order_id}`;

        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });

      return next;
    });
  }

  async function createWaybill(order) {
    const waybillId = window.prompt('Enter manual waybill ID');

    if (!waybillId) return;

    try {
      await orderApi.createWaybill(order.source, order.source_order_id, {
        waybill_id: waybillId,
        tracking_number: waybillId,
      });

      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to save waybill');
    }
  }

  async function changeManualStatus(order, nextStatus) {
    const needWaybill =
      nextStatus === 'Dispatched' ||
      nextStatus === 'Ready To Ship' ||
      nextStatus === 'Shipped';

    const hasWaybill = order.waybill_id || order.tracking_number;
    const isOtherManual = normalize(order.source_label).includes('other');

    if (needWaybill && !hasWaybill && !isOtherManual) {
      await createWaybill(order);
    }

    try {
      await orderApi.updateManualStatus(order.source_order_id, {
        status: nextStatus,
      });

      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to update status');
    }
  }

  async function darazAction(action, orderIds) {
    if (!orderIds.length) return;

    setBusy(true);

    try {
      const result = await orderApi.darazBulkAction({
        action,
        order_ids: orderIds,
      });

      const opened = openDarazDocument(result);

      if (!opened && (result.data?.errors?.length || result.data?.skipped?.length)) {
        alert(extractDarazActionMessage(result));
      }

      await load();
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Daraz action failed');
    } finally {
      setBusy(false);
    }
  }

  function runBulkAction(action) {
    const validOrders = selectedDaraz.filter((order) => {
      if (action === 'pack') return canDarazPack(order);
      if (action === 'ready_to_ship') return canDarazReady(order);
      return canDarazPrintAwb(order);
    });

    darazAction(
      action,
      validOrders.map((order) => order.source_order_id)
    );
  }

  return (
    <section className="min-h-[calc(100vh-64px)] bg-white">
      <div className="sticky top-16 z-40 w-full bg-white shadow-sm">
        <OrderToolbar
          status={status}
          setStatus={setStatus}
          counts={counts}
          query={query}
          setQuery={setQuery}
          onOpenFilter={() => setFilterOpen(true)}
          activeFilterCount={activeFilterCount(filters)}
        />

        <BulkActionBar
          selectedCount={selectedOrders.length}
          onAction={runBulkAction}
          busy={busy}
          canPack={selectedDaraz.some(canDarazPack)}
          canReady={selectedDaraz.some(canDarazReady)}
          canAwb={selectedDaraz.some(canDarazPrintAwb)}
        />
      </div>

      <div className="px-4 py-4 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="flex h-56 items-center justify-center bg-white text-sm font-normal text-slate-500">
              Loading orders...
            </div>
          ) : (
            <OrderTable
              orders={visibleOrders}
              selectedIds={selectedIds}
              onToggle={toggleOrder}
              onToggleAll={toggleAll}
              onCreateWaybill={createWaybill}
              onStatusChange={changeManualStatus}
              onDarazAction={darazAction}
              onImagePreview={setImage}
              busy={busy}
            />
          )}
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        filters={filters}
        setFilters={setFilters}
        options={options}
        onClose={() => setFilterOpen(false)}
        onReset={() => setFilters(blankFilters)}
      />

      <ImagePreview image={image} onClose={() => setImage(null)} />
    </section>
  );
}