import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { App } from './app';
import { BackendService } from './services/backend.service';

describe('Calendar authentication gate', () => {
  beforeEach(async () => {
    localStorage.setItem('language', 'en');
    await TestBed.configureTestingModule({ imports: [App], providers: [provideTranslateService()] }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      app: { title: 'Jambiz Advent Calendar' },
      online: { welcome: 'Sign in to play', signIn: 'Sign in with Microsoft', connectionError: 'Connection failed' },
    });
  });
  it('hides games and scoreboards before tenant sign-in', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Jambiz Advent Calendar');
    expect(page.querySelector('app-calendar')).toBeNull();
    expect(page.querySelector('app-scoreboard')).toBeNull();
    expect(page.textContent).toContain('Sign in with Microsoft');
    fixture.destroy();
  });
  it('keeps the calendar hidden if sign-in succeeds but progress fails to load', () => {
    const backend = TestBed.inject(BackendService);
    backend.signedIn.set(true);
    backend.error.set('online.connectionError');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('app-calendar')).toBeNull();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Connection failed');
    fixture.destroy();
  });
});
