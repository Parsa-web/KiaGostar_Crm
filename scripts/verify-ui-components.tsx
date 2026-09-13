import {renderToStaticMarkup} from 'react-dom/server'
import {Avatar,Badge,Button,Card,Checkbox,DatePicker,EmptyState,ErrorState,FileInput,Form,FormActions,FormRow,Grid,IconButton,MultiSelect,OTPField,PasswordField,RadioGroup,SearchField,Section,Select,Skeleton,Spinner,Stack,Switch,TextArea,TextField,TimePicker,Typography} from '../src/components/ui'

const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)}
const noop=()=>undefined
const option=[{value:'one',label:'گزینه یک'},{value:'two',label:'گزینه دو',disabled:true}]
const markup=renderToStaticMarkup(<div dir="rtl"><Typography variant="h1">عنوان فارسی</Typography><Button variant="danger" loading>حذف</Button><IconButton icon="search" label="جستجو"/><Avatar alt="کاربر" name="علی رضایی"/><Badge count={120}/><Card header="سرصفحه">محتوا</Card><Stack><Grid columns={2}><span>یک</span><span>دو</span></Grid></Stack><Section title="بخش"><EmptyState/><ErrorState/><Spinner/><Skeleton variant="card"/></Section><Form><FormRow><TextField label="نام" required error="خطا"/><PasswordField label="رمز"/><SearchField label="جستجو"/><TextArea label="توضیحات"/></FormRow><Checkbox label="انتخاب"/><RadioGroup name="choice" options={option}/><Switch checked={false} onChange={noop} label="فعال"/><Select options={option} label="انتخاب"/><MultiSelect options={option} value={[]} onChange={noop} label="چند انتخاب"/><OTPField value="" onChange={noop}/><DatePicker onChange={noop} label="تاریخ"/><TimePicker onChange={noop} label="زمان"/><FileInput files={[]} onChange={noop}/><FormActions><Button>ذخیره</Button></FormActions></Form></div>)
assert(markup.includes('dir="rtl"'),'RTL root was not rendered')
assert(markup.includes('aria-busy="true"'),'Loading button semantics are missing')
assert(markup.includes('aria-label="جستجو"'),'Icon button label is missing')
assert(markup.includes('aria-invalid="true"'),'Field error semantics are missing')
assert(markup.includes('role="switch"'),'Switch semantics are missing')
assert(markup.includes('role="radiogroup"')||markup.includes('<fieldset'),'Choice group semantics are missing')
assert(!markup.includes('undefined'),'Rendered output leaked undefined')
console.log('Shared UI and form component render contracts passed.')
