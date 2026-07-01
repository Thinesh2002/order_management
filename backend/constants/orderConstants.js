const ORDER_STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'to_pack', label: 'To Pack' },
  { key: 'to_arrange', label: 'To Arrange Shipment' },
  { key: 'ready_to_ship', label: 'Ready To Ship' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

const ORDER_SOURCES = ['manual', 'daraz', 'woo', 'all'];
const PLATFORM_CODES = ['DARAZ', 'WOO', 'TRANS_EXPRESS'];

module.exports = {
  ORDER_STATUS_TABS,
  ORDER_SOURCES,
  PLATFORM_CODES,
};
