import { handleBooking } from '../lib/booking.ts';
export default { fetch(request: Request): Promise<Response> { return handleBooking(request, process.env, fetch); } };
