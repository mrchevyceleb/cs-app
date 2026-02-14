/**
 * Customer Channel Service
 * Find or create customers based on channel identifiers (email, phone, etc.)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Customer, CustomerInsert, ChannelType, PreferredChannel, Json } from '@/types/database';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing required Supabase environment variables');
    }
    _supabase = createClient<Database>(url, key);
  }
  return _supabase;
}

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
  const { data: existing } = await getSupabase()
    .from('customers')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (existing) {
    // Update name if provided and not set
    if (name && !existing.name) {
      await getSupabase()
        .from('customers')
        .update({ name })
        .eq('id', existing.id);
      existing.name = name;
    }
    return { customer: existing, created: false };
  }

  // Create new customer
  const { data: created, error } = await getSupabase()
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
 * Find or create a customer by any identifier
 */
export async function findOrCreateCustomer(
  identifier: string,
  channel: ChannelType,
  name?: string | null
): Promise<FindOrCreateResult> {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  if (isEmail) {
    return findOrCreateCustomerByEmail(identifier, name);
  }

  // For other channels, try to find by metadata
  const { data: existing } = await getSupabase()
    .from('customers')
    .select('*')
    .contains('metadata', { [`${channel}_id`]: identifier })
    .single();

  if (existing) {
    return { customer: existing, created: false };
  }

  // Create with the identifier stored in metadata
  const { data: created, error } = await getSupabase()
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
  await getSupabase()
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
    updateData.phone_number = updates.phone_number;
  }

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (Object.keys(updateData).length > 0) {
    await getSupabase()
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
    case 'email':
      return customer.email || null;
    default:
      return customer.email || null;
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
  const { data: primary } = await getSupabase()
    .from('customers')
    .select('*')
    .eq('id', primaryId)
    .single();

  const { data: secondary } = await getSupabase()
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

  await getSupabase()
    .from('customers')
    .update(updates)
    .eq('id', primaryId);

  // Move tickets to primary customer
  await getSupabase()
    .from('tickets')
    .update({ customer_id: primaryId })
    .eq('customer_id', secondaryId);

  // Delete secondary customer
  await getSupabase()
    .from('customers')
    .delete()
    .eq('id', secondaryId);
}
