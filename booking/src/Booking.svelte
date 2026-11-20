<script lang="ts">
  import { onMount } from 'svelte';
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Checkbox } from '$lib/components/ui/checkbox/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import Starfield from '$lib/Starfield.svelte';
  import {
    today,
    getLocalTimeZone,
    type DateValue,
  } from '@internationalized/date';
  import { api, locationData, type Config, type BookingRecord } from './api';
  let config = $state<Config | null>(null),
    record = $state<BookingRecord | null>(null),
    slots = $state<string[]>([]),
    date = $state<DateValue>(),
    selected = $state(''),
    zone = $state(getLocalTimeZone()),
    name = $state(''),
    email = $state(''),
    question = $state(''),
    accepted = $state(false),
    busy = $state(false),
    error = $state(''),
    notice = $state(''),
    loaded = $state(false),
    manageId = $state(''),
    token = $state(''),
    rescheduling = $state(false),
    requestId = $state('');
  const zones = Array.from(
    new Set([
      getLocalTimeZone(),
      'America/Los_Angeles',
      'America/New_York',
      'Europe/London',
      'Europe/Paris',
      'Asia/Kolkata',
      'Asia/Tokyo',
      'Australia/Sydney',
      'UTC',
    ]),
  );
  const localDay = (value: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  const daySlots = $derived(
    slots.filter((slot) => date && localDay(slot) === date.toString()),
  );
  const money = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config?.currency || 'usd',
    }).format(amount / 100);
  const when = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(value));
  async function action(fn: () => Promise<void>) {
    busy = true;
    error = '';
    notice = '';
    try {
      await fn();
    } catch (e) {
      error =
        e instanceof Error ? e.message : 'Something went wrong. Please retry.';
    } finally {
      busy = false;
    }
  }
  async function refresh() {
    record = await api<BookingRecord>('status', { id: manageId, token });
  }
  async function loadSlots() {
    slots = await api<string[]>(
      'slots',
      rescheduling ? { ignoreId: manageId, id: manageId, token } : {},
    );
    selected = '';
  }
  async function reserve(event: SubmitEvent) {
    event.preventDefault();
    await action(async () => {
      const result = await api<{ id: string; token: string; url: string }>(
        'reserve',
        {
          name,
          email,
          question,
          start: selected,
          accepted,
          policyVersion: config!.policyVersion,
          requestId,
        },
      );
      manageId = result.id;
      token = result.token;
      await refresh();
      notice = 'Your slot is reserved. Continue to secure payment below.';
      sessionStorage.setItem(
        'advisory-pending',
        JSON.stringify({ id: manageId, token }),
      );
    });
  }
  async function changeTime() {
    await action(async () => {
      record = await api<BookingRecord>('reschedule', {
        id: manageId,
        token,
        start: selected,
      });
      rescheduling = false;
      notice =
        'Your appointment has been rescheduled. An updated invitation will be sent.';
    });
  }
  async function cancel() {
    if (
      !window.confirm(
        'Cancel this session under the booking policy shown below?',
      )
    )
      return;
    await action(async () => {
      record = await api<BookingRecord>('cancel', { id: manageId, token });
      notice =
        'Cancellation request processed. Check the booking and refund status below.';
    });
  }
  onMount(() => {
    requestId = crypto.randomUUID();
    void action(async () => {
      const params = await locationData();
      config = await api<Config>('config');
      manageId = params.get('booking') || '';
      token = params.get('token') || '';
      if (!manageId) {
        try {
          const saved = JSON.parse(
            sessionStorage.getItem('advisory-pending') || 'null',
          );
          if (saved) {
            manageId = saved.id;
            token = saved.token;
          }
        } catch {}
      }
      if (manageId && token) await refresh();
      else if (config.enabled) await loadSlots();
      loaded = true;
    });
  });
</script>

<Starfield />
<div class="booking-shell">
  <header class="mb-10 flex flex-wrap items-center justify-between gap-4">
    <a href="https://wikipediabrown.dev/" class="font-bold"
      >[ wb ] Wikipedia Brown</a
    ><span class="text-muted-foreground text-sm">Private AI Advisory</span>
  </header>
  <h1 class="text-4xl md:text-5xl mb-4">
    Let's think it <span class="text-primary">through.</span>
  </h1>
  <p class="text-muted-foreground mb-8">
    One focused conversation. Your questions, experienced judgment, and
    practical next steps.
  </p>
  {#if error}<Alert.Root variant="destructive" class="mb-6"
      ><Alert.Title>We couldn't complete that</Alert.Title><Alert.Description
        >{error}</Alert.Description
      ></Alert.Root
    >{/if}
  {#if notice}<Alert.Root class="mb-6"
      ><Alert.Title>Booking update</Alert.Title><Alert.Description
        >{notice}</Alert.Description
      ></Alert.Root
    >{/if}
  {#if !loaded}<p role="status">
      {busy
        ? 'Loading booking details…'
        : 'Booking details could not be loaded.'}
    </p>
    {#if !busy}<Button onclick={() => location.reload()}>Retry</Button>{/if}
  {:else if !config || (!config.enabled && !record)}<Card.Root
      ><Card.Header
        ><Card.Title>Booking is not open yet</Card.Title><Card.Description
          >Availability and booking policies are being finalized. No payment is
          collected.</Card.Description
        ></Card.Header
      ><Card.Footer
        ><Button href="https://wikipediabrown.dev/" variant="outline"
          >Back to the site</Button
        ></Card.Footer
      ></Card.Root
    >
  {:else}
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <Badge
        >{money(config.amount)} USD · {config.durationMinutes} minutes</Badge
      ><span class="text-sm text-muted-foreground"
        >Organizer: Pacific time (PST/PDT)</span
      ><Select.Root type="single" bind:value={zone}
        ><Select.Trigger aria-label="Display time zone" class="w-auto"
          >{zone}</Select.Trigger
        ><Select.Content
          >{#each zones as z}<Select.Item value={z}>{z}</Select.Item
            >{/each}</Select.Content
        ></Select.Root
      >
    </div>
    {#if record}<Card.Root class="mb-6"
        ><Card.Header
          ><Card.Title>Your appointment</Card.Title><Card.Description
            >{when(record.start)} · {zone}</Card.Description
          ></Card.Header
        ><Card.Content class="space-y-4"
          ><p>Hello, {record.name}.</p>
          {#if config?.webAppUrl}<a
              class="text-primary underline"
              href={`${config.webAppUrl}#booking=${manageId}&token=${token}`}
              >Save your private management link ↗</a
            >{/if}
          <div class="flex flex-wrap gap-2">
            <Badge>{record.status}</Badge><Badge variant="outline"
              >Payment: {record.paymentStatus}</Badge
            >{#if record.refundStatus}<Badge variant="outline"
                >Refund: {record.refundStatus} · {money(
                  record.refundAmount,
                )}</Badge
              >{/if}
          </div>
          {#if record.status === 'cancelled' && record.canReschedule}<p>
              Your paid session remains available. Choose Reschedule to book
              another available time without paying again.
            </p>{/if}{#if record.message}<p role="status">
              {record.message}
            </p>{/if}{#if record.meeting}<p class="whitespace-pre-wrap">
              Meeting: {record.meeting}
            </p>{/if}{#if ['pending', 'creating', 'paid'].includes(record.status)}<p
            >
              Payment verification and calendar confirmation may take a few
              minutes. You can close this page; processing continues
              independently.
            </p>{/if}</Card.Content
        ><Card.Footer class="flex flex-wrap gap-3"
          >{#if record.checkoutUrl}<Button href={record.checkoutUrl}
              >Continue to secure payment ↗</Button
            >{/if}<Button
            variant="outline"
            disabled={busy}
            onclick={() => action(refresh)}>Refresh status</Button
          >{#if record.canReschedule}<Button
              variant="outline"
              disabled={busy}
              onclick={() =>
                action(async () => {
                  rescheduling = true;
                  await loadSlots();
                })}>Reschedule</Button
            >{/if}{#if record.canCancel}<Button
              variant="destructive"
              disabled={busy}
              onclick={cancel}>Cancel session</Button
            >{/if}</Card.Footer
        ></Card.Root
      >{/if}
    {#if !record || rescheduling}<div class="grid gap-6 md:grid-cols-2">
        <Card.Root
          ><Card.Header
            ><Card.Title
              >{rescheduling
                ? 'Choose a new time'
                : 'Choose a time'}</Card.Title
            ><Card.Description
              >Times displayed in {zone}. Availability is checked again before
              reservation.</Card.Description
            ></Card.Header
          ><Card.Content
            ><Calendar
              type="single"
              bind:value={date}
              minValue={today(zone)}
              isDateUnavailable={(day) =>
                !slots.some((slot) => localDay(slot) === day.toString())}
            />
            <fieldset class="mt-6">
              <legend class="mb-3"
                >{date
                  ? `Available times on ${date}`
                  : 'Select an available day'}</legend
              >
              <div class="grid grid-cols-2 gap-2">
                {#each daySlots as slot}<Button
                    variant={selected === slot ? 'default' : 'outline'}
                    aria-pressed={selected === slot}
                    onclick={() => (selected = slot)}
                    >{new Intl.DateTimeFormat('en-US', {
                      timeZone: zone,
                      timeStyle: 'short',
                    }).format(new Date(slot))}</Button
                  >{/each}
              </div>
              {#if date && !daySlots.length}<p>
                  No times available on this day.
                </p>{/if}{#if !slots.length}<p>
                  No appointments are currently available. Please check again
                  later.
                </p>{/if}
            </fieldset>
            <Button
              class="mt-4"
              variant="ghost"
              disabled={busy}
              onclick={() => action(loadSlots)}>Refresh availability</Button
            ></Card.Content
          ></Card.Root
        >
        <Card.Root
          ><Card.Header
            ><Card.Title
              >{rescheduling
                ? 'Confirm your new time'
                : 'What would you like to discuss?'}</Card.Title
            ><Card.Description
              >{selected
                ? when(selected)
                : 'Choose a time to continue.'}</Card.Description
            ></Card.Header
          ><Card.Content
            >{#if rescheduling}<Button
                disabled={!selected || busy}
                onclick={changeTime}>Confirm reschedule</Button
              ><Button variant="ghost" onclick={() => (rescheduling = false)}
                >Keep current appointment</Button
              >{:else}<form onsubmit={reserve} class="space-y-5">
                <div class="space-y-2">
                  <Label for="name">Name</Label><Input
                    id="name"
                    bind:value={name}
                    required
                    maxlength={120}
                    autocomplete="name"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="email">Email</Label><Input
                    id="email"
                    type="email"
                    bind:value={email}
                    required
                    maxlength={254}
                    autocomplete="email"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="question">Your main question</Label><Textarea
                    id="question"
                    bind:value={question}
                    required
                    minlength={10}
                    maxlength={3000}
                    rows={5}
                  />
                  <p class="text-xs text-muted-foreground">
                    Please don't include confidential employer or customer
                    information.
                  </p>
                </div>
                <div class="flex items-start gap-3">
                  <Checkbox id="accepted" bind:checked={accepted} /><Label
                    for="accepted"
                    >I have read and accept the booking policies below.</Label
                  >
                </div>
                <Button type="submit" disabled={!selected || !accepted || busy}
                  >{busy
                    ? 'Reserving…'
                    : `Reserve and pay ${money(config.amount)}`}</Button
                >
                <p class="text-xs text-muted-foreground">
                  Your slot is held for 30 minutes during checkout. Payment is
                  processed by Stripe.
                </p>
              </form>{/if}</Card.Content
          ></Card.Root
        >
      </div>{/if}
    <Card.Root class="mt-8"
      ><Card.Header><Card.Title>Booking policies</Card.Title></Card.Header
      ><Card.Content
        ><p class="whitespace-pre-wrap">{config.policyText}</p>
        <p class="mt-4 text-xs text-muted-foreground">
          Policy version: {config.policyVersion}. This is independent advisory
          in a personal capacity.
        </p></Card.Content
      ></Card.Root
    >
  {/if}
  <footer class="mt-10 text-sm text-muted-foreground">
    Your booking details are private. Keep your management link private too.
  </footer>
</div>
