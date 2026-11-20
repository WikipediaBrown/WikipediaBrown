<script>
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import * as Accordion from '$lib/components/ui/accordion/index.js';
  import { bookingUrl } from '$lib/config';
</script>

<SEO
  title="Private AI Advisory"
  path="/advisory/"
  description="A focused, independent conversation about AI. $500 for 60 minutes."
/>
<section class="section">
  <div class="section__head">
    <span class="section__num">AI / 1:1</span>
    <h1 class="section__title">
      A conversation.<br /><em>A clearer direction.</em>
    </h1>
    <span class="section__kicker">Private AI advisory</span>
  </div>
  <div class="grid gap-8 lg:grid-cols-2">
    <div class="space-y-6">
      <p class="contact__lede">
        Bring an AI question, a business challenge, or an idea worth thinking
        through. We'll explore the options, tradeoffs, and practical next steps
        together.
      </p>
      <p>
        For founders, leaders, and professionals who want experienced judgment
        on applying AI, evaluating an approach, or making sense of a complex
        topic.
      </p>
      <p class="text-muted-foreground">
        Independent advisory in a personal capacity. Bring examples you are
        authorized to share; leave confidential employer and customer
        information out of the session.
      </p>
    </div>
    <Card.Root
      ><Card.Header
        ><Card.Title>Private AI Advisory</Card.Title><Card.Description
          >60 minutes · Mon–Sat, noon–6 p.m. Pacific</Card.Description
        ></Card.Header
      ><Card.Content
        ><p class="text-4xl font-bold">
          $500 <span class="text-sm text-muted-foreground">USD / session</span>
        </p>
        <p class="mt-4">
          Choose a time, share your question, and pay securely through Stripe.
          Your confirmation includes a calendar invitation and meeting details.
        </p></Card.Content
      ><Card.Footer
        >{#if bookingUrl}<Button href={bookingUrl}>Choose a time ↗</Button
          >{:else}<Alert.Root
            ><Alert.Title>Booking is not open yet</Alert.Title
            ><Alert.Description
              >Availability and booking policies are being finalized. No payment
              is collected here.</Alert.Description
            ></Alert.Root
          >{/if}</Card.Footer
      ></Card.Root
    >
  </div>
  <Accordion.Root type="single" class="mt-12"
    ><Accordion.Item value="topics"
      ><Accordion.Trigger>What can we discuss?</Accordion.Trigger
      ><Accordion.Content
        >AI adoption, feasibility, tools, architecture tradeoffs, and a second
        opinion on your idea. Share your main question when booking so we can
        focus the conversation.</Accordion.Content
      ></Accordion.Item
    ><Accordion.Item value="scope"
      ><Accordion.Trigger>What does the session include?</Accordion.Trigger
      ><Accordion.Content
        >A dedicated 60-minute conversation and a brief recap. Implementation or
        additional research requires a separate agreement.</Accordion.Content
      ></Accordion.Item
    ><Accordion.Item value="policies"
      ><Accordion.Trigger
        >How do cancellation and rescheduling work?</Accordion.Trigger
      ><Accordion.Content
        >Payments are non-refundable, including cancellations. A cancelled paid
        session can be rescheduled to another available time without another
        payment. Confirmation emails contain a private link to manage your
        appointment.</Accordion.Content
      ></Accordion.Item
    ></Accordion.Root
  >
</section>
