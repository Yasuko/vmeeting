import { trigger, state, animate, transition, style } from '@angular/animations';

export const confirmationAnimation =
    trigger('confirmationAnimation', [
        state('show', style({
            opacity: 1,
        })),
        state('hide', style({
            opacity: 0,
        })),
        transition('show => hide', animate('0.2s ease-in')),
        transition('hide => show', animate('0.5s ease-out'))
    ]);
