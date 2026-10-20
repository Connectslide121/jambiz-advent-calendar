import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Calendar } from './calendar';
import { CalendarStateService } from '../../services/calendar-state.service';
import { SoundService } from '../../services/sound.service';
import { CALENDAR_DAYS } from '../../config/calendar-config';

describe('Completed calendar doors', () => {
  it('opens a replay when the revealed picture is clicked', fakeAsync(() => {
    const state = jasmine.createSpyObj('CalendarStateService', ['isDayCompleted', 'isDayUnlocked',
      'isCalendarComplete', 'isFullyUnlocked', 'getCompletedDays', 'getCompletedCount', 'getEffectiveDecemberDay']);
    state.isDayCompleted.and.returnValue(true);
    state.isDayUnlocked.and.returnValue(true);
    state.isCalendarComplete.and.returnValue(false);
    state.isFullyUnlocked.and.returnValue(false);
    state.getCompletedDays.and.returnValue([1]);
    state.getCompletedCount.and.returnValue(1);
    state.getEffectiveDecemberDay.and.returnValue(0);
    TestBed.configureTestingModule({ imports: [Calendar], providers: [provideTranslateService(),
      { provide: CalendarStateService, useValue: state },
      { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['doorOpen', 'thud', 'fanfare']) },
    ] });
    CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, { day: 1, challengeType: 'juldle', gridPosition: 0 });
    const fixture = TestBed.createComponent(Calendar);
    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.replay-target') as HTMLButtonElement;
    expect(target).not.toBeNull();
    target.click();
    tick(650);
    expect(fixture.componentInstance.selectedDay?.day).toBe(1);
    fixture.destroy();
    CALENDAR_DAYS.splice(0);
  }));
});
