import type { SiteFaq } from "@/lib/methodology"

export function FaqList({
  faqs,
  title = "Frequently asked questions",
}: {
  faqs: SiteFaq[]
  title?: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold text-balance text-ink">
        {title}
      </h2>
      <dl className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <div className="flex flex-col gap-1" key={faq.question}>
            <dt className="text-[13px] font-medium text-pretty text-ink">
              {faq.question}
            </dt>
            <dd className="text-[13px] leading-relaxed text-pretty text-ink-2">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
