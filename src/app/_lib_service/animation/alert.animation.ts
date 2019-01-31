import { trigger, state, animate, transition, style } from '@angular/animations';

export const alertAnimation =
    trigger('alertAnimation', [
        // route 'enter' transition
        state('show', style({
            opacity: 1,
            top: '10px',
            margin: '0 auto'
        })),
        state('hide', style({
            opacity: 0,
            top: '-10px'
        })),
        transition('show => hide', animate('1s ease-in')),
        transition('hide => show', animate('1s ease-out'))
    ]);
