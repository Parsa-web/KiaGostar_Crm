# Shared UI and form components

Import reusable presentation primitives from `src/components/ui`. Feature modules should compose these controls and keep business validation in their existing services.

## Core examples

```tsx
<Typography as="h1" variant="h1">جلسات</Typography>
<Button variant="primary" startIcon={<Icon name="plus" />}>جلسه جدید</Button>
<Card variant="outlined" header="اطلاعات جلسه">...</Card>
<Stack direction="horizontal" gap={3} wrap>...</Stack>
<Grid columns="auto-fit" gap={4}>...</Grid>
```

Buttons prevent repeated actions while `loading` is true. Icon-only buttons require a Persian accessible `label`. Internal navigation uses `LinkButton`, which delegates to the existing application navigation layer.

## Form examples

```tsx
<Form onSubmit={handleSubmit}>
  <FormRow>
    <TextField label="عنوان" required error={errors.title} />
    <Select label="واحد" options={departments} value={departmentId} onChange={setDepartmentId} />
  </FormRow>
  <DatePicker calendar="jalali" label="تاریخ" value={date} onChange={setDate} />
  <FormActions><Button type="submit">ذخیره</Button></FormActions>
</Form>
```

Fields associate labels, hints, errors, and success messages through semantic HTML and ARIA. Controlled values remain owned by the feature form. Components do not call repositories, services, APIs, or workflow logic.

## Select and autocomplete

`Select`, `MultiSelect`, and `Autocomplete` accept typed `SelectOption` values. Search and keyboard navigation are built in. Async consumers pass new options and the `loading` state; fetching and debouncing remain the caller’s responsibility.

## Date and file values

`DatePicker` displays a Persian/Jalali calendar by default while returning a Gregorian ISO date string, preserving existing domain contracts. `FileInput` only selects, validates size, previews, and removes browser `File` values. Upload orchestration remains in the existing file service.

## Accessibility and RTL

All controls inherit the document’s Persian RTL direction, use logical CSS properties, preserve focus rings, expose loading/disabled/error semantics, and meet the shared touch-target rules. Directional icons opt into mirroring; neutral icons do not.
