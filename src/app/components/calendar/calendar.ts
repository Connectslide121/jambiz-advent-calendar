import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CalendarStateService } from '../../services/calendar-state.service';
import { CalendarDayConfig } from '../../models/calendar.models';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit {
  calendarDays: CalendarDayConfig[] = CALENDAR_DAYS;
  selectedDay: CalendarDayConfig | null = null;

  constructor(public stateService: CalendarStateService) {}

  ngOnInit(): void {}

  onDaySelected(day: CalendarDayConfig): void {
    this.selectedDay = day;
    // TODO: Open challenge modal
    console.log('Selected day:', day);
  }

  isDayCompleted(day: number): boolean {
    return this.stateService.isDayCompleted(day);
  }
}
