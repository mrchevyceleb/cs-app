/**
 * Customer Channel Service
 * Find or create customers based on channel identifiers (email, phone, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import type { Customer, CustomerInsert, ChannelType, PreferredChannel, Json } from '@/types/database';
import { normalizePhoneNumber } from '@/lib/twilio/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FindOrCreateResult {
  customer: Customer;
  created: boolean;
}

/**
 * Find or create a customer by email
 */
export async function findOrCreateCustomerByEmail(
  email: string,
  name?: string | null
): Promise<FindOrCreateResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing customer
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (existing) {
    // Update name if provided and not set
    if (name && !existing.name) {
      await supabase
        .from('customers')
        .update({ name })
        .eq('id', existing.id);
      existing.name = name;
    }
    return { customer: existing, created: false };
  }

  // Create new customer
  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      email: normalizedEmail,
      name: name || null,
      preferred_channel: 'email',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return { customer: created, created: true };
}

/**
 * Find or create a customer by phone number
 */
export async function findOrCreateCustomerByPhone(
  phone: string,
  name?: string | null
): Promise<FindOrCreateResult> {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    throw new Error('Invalid phone number');
  }

  // Try to find existing customer
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .single();

  if (existing) {
    // Update name if provided and not set
    if (name && !existing.name) {
      await supabase
        .from('customers')
        .update({ name })
        .eq('id', existing.id);
      existing.name = name;
    }
    return { customer: existing, created: false };
  }

  // Create new customer
  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      phone_number: normalizedPhone,
      name: name || null,
      preferred_channel: 'sms',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return { customer: created, created: true };
}

/**
 * Find or create a customer by any identifier
 */
export async function findOrCreateCustomer(
  identifier: string,
  channel: ChannelType,
  name?: string | null
): Promise<FindOrCreateResult> {
  // Determine identifier type based on format and channel
  const isPhone = /^\+?\d{10,15}$/.test(identifier.replace(/[\s\-\(\)]/g, ''));
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  if (channel === 'sms' || (isPhone && !isEmail)) {
    return findOrCreateCustomerByPhone(identifier, name);
  }

  if (isEmail) {
    return findOrCreateCustomerByEmail(identifier, name);
  }

  // For other channels (Slack, etc.), try to find by metadata
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .contains('metadata', { [`${channel}_id`]: identifier })
    .single();

  if (existing) {
    return { customer: existing, created: false };
  }

  // Create with the identifier stored in metadata
  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      name: name || identifier,
      metadata: { [`${channel}_id`]: identifier },
      preferred_channel: channel as PreferredChannel,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return { customer: created, created: true };
}

/**
 * Update customer's preferred channel
 */
export async function updatePreferredChannel(
  customerId: string,
  channel: PreferredChannel
): Promise<void> {
  await supabase
    .from('customers')
    .update({ preferred_channel: channel })
    .eq('id', customerId);
}

/**
 * Update customer contact info (phone or email)
 */
export async function updateCustomerContact(
  customerId: string,
  updates: {
    email?: string;
    phone_number?: string;
    name?: string;
  }
): Promise<void> {
  const updateData: Partial<CustomerInsert> = {};

  if (updates.email) {
    updateData.email = updates.email.toLowerCase().trim();
  }

  if (updates.phone_number) {
    const normalized = normalizePhoneNumber(updates.phone_number);
    if (normalized) {
      updateData.phone_number = normalized;
    }
  }

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (Object.keys(updateData).length > 0) {
    await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId);
  }
}

/**
 * Get customer's contact info for a specific channel
 */
export function getCustomerChannelContact(
  customer: Customer,
  channel: ChannelType
): string | null {
  switch (channel) {
    case 'sms':
      return customer.phone_number || null;
    case 'email':
      return customer.email || null;
    case 'slack':
      return (customer.metadata as Record<string, unknown>)?.slack_id as string || null;
    default:
      return customer.email || customer.phone_number || null;
  }
}

/**
 * Merge duplicate customers (when same person contacts via different channels)
 */
export async function mergeCustomers(
  primaryId: string,
  secondaryId: string
): Promise<void> {
  // Get both customers
  const { data: primary } = await supabase
    .from('customers')
    .select('*')
    .eq('id', primaryId)
    .single();

  const { data: secondary } = await supabase
    .from('customers')
    .select('*')
    .eq('id', secondaryId)
    .single();

  if (!primary || !secondary) {
    throw new Error('Customer not found');
  }

  // Merge contact info
  const mergedMetadata = {
    ...(secondary.metadata as Record<string, unknown> || {}),
    ...(primary.metadata as Record<string, unknown> || {}),
  };

  const updates: Partial<CustomerInsert> = {
    email: primary.email || secondary.email,
    phone_number: primary.phone_number || secondary.phone_number,
    name: primary.name || secondary.name,
    metadata: mergedMetadata as Json,
  };

  await supabase
    .from('customers')
    .update(updates)
    .eq('id', primaryId);

  // Move tickets to primary customer
  await supabase
    .from('tickets')
    .update({ customer_id: primaryId })
    .eq('customer_id', secondaryId);

  // Delete secondary customer
  await supabase
    .from('customers')
    .delete()
    .eq('id', secondaryId);
}
