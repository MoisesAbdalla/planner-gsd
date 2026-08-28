// Convenção D-24: data de calendário é sempre a string explícita "YYYY-MM-DD"
// resolvida em America/Sao_Paulo — nunca o fuso do sistema onde o código
// roda, nem UTC bruto. Um instante às 23h de um dia em SP não pode escorregar
// para o dia seguinte só porque o servidor/browser está em outro fuso.
import { format } from 'date-fns'
import { TZDate } from '@date-fns/tz'

export const APP_TIME_ZONE = 'America/Sao_Paulo'

export function toCalendarDate(instant: Date): string {
  return format(new TZDate(instant, APP_TIME_ZONE), 'yyyy-MM-dd')
}

export function monthKeyOf(calendarDate: string): string {
  return calendarDate.slice(0, 7)
}
