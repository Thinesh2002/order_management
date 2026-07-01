import { text } from '../../../utils/format';

export function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function safeJson(value) {
  if (!value) return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function pick(obj, keys, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  return fallback;
}

export function formatTrackingTime(value) {
  if (!value) return '-';

  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return new Date(numericValue).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const dateValue = new Date(value);

  if (!Number.isNaN(dateValue.getTime())) {
    return dateValue.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return text(value);
}

function eventTimeNumber(value) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  const dateValue = new Date(value);
  if (!Number.isNaN(dateValue.getTime())) return dateValue.getTime();

  return 0;
}

function extractPackagesFromPayload(payload) {
  const parsed = safeJson(payload);
  if (!parsed || typeof parsed !== 'object') return [];

  const possibleModules = [
    parsed?.data?.module,
    parsed?.data?.data,
    parsed?.result?.data,
    parsed?.module,
    parsed?.data,
    parsed?.result,
  ];

  const modules = possibleModules.flatMap((item) => toArray(item)).filter(Boolean);

  return modules.flatMap((moduleItem) => {
    const packages =
      moduleItem.packageDetailInfoList ||
      moduleItem.package_detail_info_list ||
      moduleItem.package_details ||
      moduleItem.packages ||
      moduleItem.package_list ||
      [];

    return toArray(packages);
  });
}

function extractEventsFromPackage(packageItem) {
  const events =
    packageItem.logisticDetailInfoList ||
    packageItem.logistic_detail_info_list ||
    packageItem.tracking_events ||
    packageItem.events ||
    [];

  return toArray(events);
}

export function buildTrackingRows(live) {
  const payloads = [live?.logistics, live?.trace].filter(Boolean);

  const rows = payloads.flatMap((payload) =>
    extractPackagesFromPayload(payload).flatMap((packageItem, packageIndex) => {
      const packageId = pick(packageItem, ['ofcPackageId', 'ofc_package_id', 'package_id']);
      const trackingNumber = pick(packageItem, ['trackingNumber', 'tracking_number', 'tracking_code']);
      const events = extractEventsFromPackage(packageItem);

      if (!events.length) {
        return [
          {
            key: `${packageId || trackingNumber || packageIndex}-empty`,
            packageId,
            trackingNumber,
            title: 'Package created',
            description: 'No tracking movement received yet.',
            statusCode: '',
            detailType: '',
            time: '',
            timeText: '-',
          },
        ];
      }

      return events.map((event, eventIndex) => {
        const time = pick(event, ['eventTime', 'event_time', 'eventDate', 'event_date']);

        return {
          key: `${packageId || trackingNumber || packageIndex}-${eventIndex}-${time}`,
          packageId,
          trackingNumber,
          title: pick(event, ['title'], 'Tracking update'),
          description: pick(event, ['description'], 'No description available.'),
          statusCode: pick(event, ['statusCode', 'status_code', 'code', 'status']),
          detailType: pick(event, ['detailType', 'detail_type']),
          time,
          timeText: formatTrackingTime(time),
        };
      });
    })
  );

  const unique = new Map();

  rows.forEach((row) => {
    const uniqueKey = `${row.packageId}-${row.trackingNumber}-${row.title}-${row.description}-${row.time}`;
    unique.set(uniqueKey, row);
  });

  return Array.from(unique.values()).sort(
    (a, b) => eventTimeNumber(b.time) - eventTimeNumber(a.time)
  );
}

export function getMainPackage(order, rows = []) {
  const firstItem = order?.items?.[0] || {};
  const latestRow = rows[0] || {};

  return {
    packageId: latestRow.packageId || firstItem.package_id,
    trackingNumber:
      latestRow.trackingNumber ||
      firstItem.tracking_code ||
      firstItem.tracking_number ||
      order?.waybill_id ||
      order?.tracking_number,
    provider:
      firstItem.shipment_provider ||
      order?.shipment_provider ||
      'Daraz logistics',
  };
}