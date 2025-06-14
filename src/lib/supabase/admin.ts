import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import type { Database, Tables, TablesInsert } from "@/lib/database.types"
import { toDateTime } from "@/lib/utils"
import { stripe } from "@/lib/stripe/config"

type Product = Tables<"billing_products">
type Price = Tables<"billing_prices">

// Change to control trial period length
const TRIAL_PERIOD_DAYS = 0

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SERVICE_ROLE || ""
)

const upsertProductRecord = async (product: Stripe.Product) => {
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
    provider: "stripe",
  }

  const { error: upsertError } = await supabaseAdmin
    .from("billing_products")
    .upsert([productData])
  if (upsertError)
    throw new Error(`Product insert/update failed: ${upsertError.message}`)
  console.log(`Product inserted/updated: ${product.id}`)
}

const upsertPriceRecord = async (
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
) => {
  const priceData: Price = {
    id: price.id,
    billing_product_id: typeof price.product === "string" ? price.product : "",
    active: price.active,
    currency: price.currency,
    type: price.type,
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? TRIAL_PERIOD_DAYS,
    description: price.nickname ?? null,
    metadata: price.metadata,
    provider: "stripe",
  }

  const { error: upsertError } = await supabaseAdmin
    .from("billing_prices")
    .upsert([priceData])

  if (upsertError?.message.includes("foreign key constraint")) {
    if (retryCount < maxRetries) {
      console.log(`Retry attempt ${retryCount + 1} for price ID: ${price.id}`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await upsertPriceRecord(price, retryCount + 1, maxRetries)
    } else {
      throw new Error(
        `Price insert/update failed after ${maxRetries} retries: ${upsertError.message}`
      )
    }
  } else if (upsertError) {
    throw new Error(`Price insert/update failed: ${upsertError.message}`)
  } else {
    console.log(`Price inserted/updated: ${price.id}`)
  }
}

const deleteProductRecord = async (product: Stripe.Product) => {
  const { error: deletionError } = await supabaseAdmin
    .from("billing_products")
    .delete()
    .eq("id", product.id)
  if (deletionError)
    throw new Error(`Product deletion failed: ${deletionError.message}`)
  console.log(`Product deleted: ${product.id}`)
}

const deletePriceRecord = async (price: Stripe.Price) => {
  const { error: deletionError } = await supabaseAdmin
    .from("billing_prices")
    .delete()
    .eq("id", price.id)
  if (deletionError)
    throw new Error(`Price deletion failed: ${deletionError.message}`)
  console.log(`Price deleted: ${price.id}`)
}

const upsertCustomerToSupabase = async (org_id: string, customerId: string) => {
  const { error: upsertError } = await supabaseAdmin
    .from("billing_customers")
    .upsert([{ org_id: org_id, stripe_customer_id: customerId }])

  if (upsertError)
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    )

  return customerId
}

const createCustomerInStripe = async (org_id: string, email: string) => {
  const customerData = { metadata: { supabaseOrgId: org_id }, email: email }
  const newCustomer = await stripe.customers.create(customerData)
  if (!newCustomer) throw new Error("Stripe customer creation failed.")

  return newCustomer.id
}

const createOrRetrieveCustomer = async ({
  org_id,
  email,
}: {
  org_id: string
  email: string
}) => {
  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabaseAdmin
      .from("billing_customers")
      .select("*")
      .eq("org_id", org_id)
      .maybeSingle()

  if (queryError) {
    throw new Error(`Supabase customer lookup failed: ${queryError.message}`)
  }

  // Retrieve the Stripe customer ID using the Supabase customer ID, with email fallback
  let stripeCustomerId: string | undefined
  if (existingSupabaseCustomer?.customer_id) {
    const existingStripeCustomer = await stripe.customers.retrieve(
      existingSupabaseCustomer.customer_id
    )
    stripeCustomerId = existingStripeCustomer.id
  } else {
    // If Stripe ID is missing from Supabase, try to retrieve Stripe customer ID by email
    const stripeCustomers = await stripe.customers.list({})
    stripeCustomerId =
      stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined
  }

  // If still no stripeCustomerId, create a new customer in Stripe
  const stripeIdToInsert = stripeCustomerId
    ? stripeCustomerId
    : await createCustomerInStripe(org_id, email)
  if (!stripeIdToInsert) throw new Error("Stripe customer creation failed.")

  if (existingSupabaseCustomer && stripeCustomerId) {
    // If Supabase has a record but doesn't match Stripe, update Supabase record
    if (existingSupabaseCustomer.customer_id !== stripeCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from("billing_customers")
        .update({ customer_id: stripeCustomerId })
        .eq("org_id", org_id)

      if (updateError)
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        )
      console.warn(
        `Supabase customer record mismatched Stripe ID. Supabase record updated.`
      )
    }
    // If Supabase has a record and matches Stripe, return Stripe customer ID
    return stripeCustomerId
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    )

    // If Supabase has no record, create a new record and return Stripe customer ID
    const upsertedStripeCustomer = await upsertCustomerToSupabase(
      org_id,
      stripeIdToInsert
    )
    if (!upsertedStripeCustomer)
      throw new Error("Supabase customer record creation failed.")

    return upsertedStripeCustomer
  }
}

/**
 * Copies the billing details from the payment method to the customer object.
 */
// const copyBillingDetailsToCustomer = async (
//   uuid: string,
//   payment_method: Stripe.PaymentMethod
// ) => {

//   const customer = payment_method.customer as string
//   const { name, phone, address } = payment_method.billing_details
//   if (!name || !phone || !address) return
// @ts-expect-error - Stripe PaymentMethod is not typed
//   await stripe.customers.update(customer, { name, phone, address })
//   const { error: updateError } = await supabaseAdmin
//     .from("profiles")
//     .update({
//       billing_address: { ...address },
//       payment_method: { ...payment_method[payment_method.type] },
//     })
//     .eq("id", uuid)
//   if (updateError)
//     throw new Error(`Customer update failed: ${updateError.message}`)
// }

const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  createAction = false
) => {
  // Get customer's UUID from mapping table.
  const { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from("billing_customers")
    .select("org_id")
    .eq("customer_id", customerId)
    .single()

  if (noCustomerError)
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`)

  const { org_id: org_id } = customerData!

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  })
  // Upsert the latest status of the subscription object.
  const subscriptionData: TablesInsert<"billing_subscriptions"> = {
    id: subscription.id,
    org_id: org_id,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    //TODO check quantity on subscription
    // @ts-expect-error - Stripe Subscription is not typed
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(
      subscription.current_period_start
    ).toISOString(),
    current_period_end: toDateTime(
      subscription.current_period_end
    ).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at
      ? toDateTime(subscription.ended_at).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end).toISOString()
      : null,
  }

  const { error: upsertError } = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert([subscriptionData])
  if (upsertError)
    throw new Error(`Subscription insert/update failed: ${upsertError.message}`)
  console.log(
    `Inserted/updated subscription [${subscription.id}] for Organization [${org_id}]`
  )

  // For a new subscription copy the billing details to the customer object.
  // NOTE: This is a costly operation and should happen at the very end.
  if (createAction && subscription.default_payment_method && org_id)
    //@ts-expect-error - Stripe PaymentMethod is not typed
    await copyBillingDetailsToCustomer(
      org_id,
      subscription.default_payment_method as Stripe.PaymentMethod
    )
}

export {
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
}