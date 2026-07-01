import Info from './Info.jsx';
import Section from './Section.jsx';
import { fullCustomerAddress } from '../../../utils/orderHelpers';

export default function CustomerShippingCards({ order }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Customer details">
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Name" value={order.customer_name || order.shipping_name} />
          <Info label="Phone" value={order.customer_phone || order.shipping_phone} />
          <Info label="Email" value={order.customer_email} />
          <Info label="Company" value={order.company_name} />
        </div>
      </Section>

      <Section title="Shipping details">
        <div className="space-y-3">
          <Info label="Address" value={fullCustomerAddress(order)} />
          <Info label="Waybill / Tracking" value={order.waybill_id || order.tracking_number} />
        </div>
      </Section>
    </div>
  );
}
