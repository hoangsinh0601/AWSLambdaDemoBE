export const handler = async (event) => {
  const records = event?.Records ?? [];

  for (const record of records) {
    try {
      const message = JSON.parse(record.body);
      console.log(
        'Simulating inventory deduction for order:',
        JSON.stringify({
          orderId: message.orderId,
          status: message.status,
          items: message.items,
        })
      );
    } catch (error) {
      console.error('Failed to process queue message', {
        body: record.body,
        error,
      });
      throw error;
    }
  }
};
