import { Suspense } from 'react';
import Login from "./Login";

export default function Signin(){
    return(
        <Suspense fallback={<div />}> 
          <Login />
        </Suspense>
    );
}