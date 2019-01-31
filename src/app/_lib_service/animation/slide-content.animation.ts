import { trigger, state, animate, transition, style, keyframes } from '@angular/animations';
export const slideContentAnimation =
    trigger('slideStatus', [

        // end state styles for route container (host)
        state('*', style({
            // the view covers the whole screen with a semi tranparent background
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
        })),


        // route 'enter' transition
        transition('* => show', [
            style({
                right: '-2000px',
                backgroundColor: 'rgba(0, 0, 0, 0)'
            }),
            animate('.5s ease-in-out', style({
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }))
        ]),

        // route 'leave' transition
        transition('* => hide', [
            animate('.5s ease-in-out', style({
                right: '-2000px',
                backgroundColor: 'rgba(0, 0, 0, 0)'
            }))
        ])
    ]);
