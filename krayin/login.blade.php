<x-admin::layouts.anonymous>
    <x-slot:title>
        @lang('admin::app.users.login.title')
    </x-slot>

    @push('styles')
    <style>
        body { margin:0!important; padding:0!important; background:#0a0a0a!important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important; }
        #app>.flex { display:none!important; }
        #app>.text-sm { display:none!important; }

        .uw-wrap { display:flex!important; min-height:100vh!important; align-items:center!important; justify-content:center!important; background:#0a0a0a!important; position:relative!important; overflow:hidden!important; }
        .uw-wrap::before { content:''!important; position:absolute!important; inset:0!important; background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)!important; background-size:60px 60px!important; }
        .uw-wrap::after { content:''!important; position:absolute!important; top:30%!important; left:50%!important; transform:translate(-50%,-50%)!important; width:500px!important; height:500px!important; background:radial-gradient(circle,rgba(36,215,88,0.06) 0%,transparent 70%)!important; pointer-events:none!important; }
        .uw-box { position:relative!important; z-index:1!important; width:100%!important; max-width:420px!important; padding:0 1.5rem!important; }
        .uw-logo { text-align:center!important; margin-bottom:2.5rem!important; display:flex!important; justify-content:center!important; }
        .uw-logo img { height:40px!important; width:auto!important; display:block!important; margin:0 auto!important; }
        .uw-card { background:#111!important; border:1px solid rgba(255,255,255,0.06)!important; border-radius:20px!important; overflow:hidden!important; box-shadow:0 30px 60px rgba(0,0,0,0.4)!important; }
        .uw-line { height:2px!important; background:linear-gradient(90deg,transparent 5%,#24d758 35%,#27dab4 65%,transparent 95%)!important; }
        .uw-body { padding:2rem 2rem 1.5rem!important; }
        .uw-h1 { color:#fff!important; font-size:1.5rem!important; font-weight:700!important; margin:0 0 .25rem!important; text-align:center!important; }
        .uw-sub { color:#666!important; font-size:.85rem!important; margin:0 0 1.75rem!important; text-align:center!important; }
        .uw-grp { margin-bottom:1.25rem!important; }
        .uw-lbl { display:block!important; color:#888!important; font-size:.75rem!important; font-weight:600!important; text-transform:uppercase!important; letter-spacing:.06em!important; margin-bottom:.5rem!important; }
        .uw-inp { width:100%!important; padding:.75rem 1rem!important; background:#1a1a1a!important; border:1px solid rgba(255,255,255,0.08)!important; border-radius:12px!important; color:#fff!important; font-size:.9rem!important; outline:none!important; transition:border-color .2s,box-shadow .2s!important; box-sizing:border-box!important; }
        .uw-inp:focus { border-color:#24d758!important; box-shadow:0 0 0 3px rgba(36,215,88,0.1)!important; }
        .uw-inp::placeholder { color:#444!important; }
        .uw-pw { position:relative!important; }
        .uw-pw .uw-inp { padding-right:3rem!important; }
        .uw-eye { position:absolute!important; right:1rem!important; top:50%!important; transform:translateY(-50%)!important; background:none!important; border:none!important; color:#555!important; cursor:pointer!important; font-size:1.1rem!important; padding:0!important; }
        .uw-eye:hover { color:#888!important; }
        .uw-foot { display:flex!important; align-items:center!important; justify-content:space-between!important; padding:1.25rem 2rem!important; border-top:1px solid rgba(255,255,255,0.06)!important; }
        .uw-fgt { color:#24d758!important; font-size:.8rem!important; font-weight:600!important; text-decoration:none!important; }
        .uw-fgt:hover { text-decoration:underline!important; }
        .uw-btn { background:#24d758!important; color:#051a0c!important; border:none!important; padding:.65rem 2rem!important; border-radius:10px!important; font-weight:700!important; font-size:.85rem!important; cursor:pointer!important; transition:opacity .2s!important; }
        .uw-btn:hover { opacity:.9!important; }
        .uw-copy { text-align:center!important; margin-top:2rem!important; color:#333!important; font-size:.75rem!important; }
        .uw-err { color:#ff4d4d!important; font-size:.75rem!important; margin-top:.35rem!important; }
    </style>
    @endpush

    <div class="uw-wrap">
        <div class="uw-box">
            <div class="uw-logo">
                @if ($logo = core()->getConfigData('general.design.admin_logo.logo_image'))
                    <img src="{{ Storage::url($logo) }}" alt="Underwings">
                @else
                    <img src="{{ vite()->asset('images/logo.svg') }}" alt="Underwings">
                @endif
            </div>
            <div class="uw-card">
                <div class="uw-line"></div>
                <form method="POST" action="{{ route('admin.session.store') }}">
                    @csrf
                    <div class="uw-body">
                        <h1 class="uw-h1">Welcome back</h1>
                        <p class="uw-sub">Sign in to Underwings CRM</p>
                        <div class="uw-grp">
                            <label class="uw-lbl" for="uw-email">Email</label>
                            <input class="uw-input uw-inp" type="email" id="uw-email" name="email" required placeholder="you@underwings.org" value="{{ old('email') }}" autofocus>
                            @error('email')<div class="uw-err">{{ $message }}</div>@enderror
                        </div>
                        <div class="uw-grp">
                            <label class="uw-lbl" for="uw-password">Password</label>
                            <div class="uw-pw">
                                <input class="uw-input uw-inp" type="password" id="uw-password" name="password" required placeholder="Enter your password" minlength="6">
                                <button type="button" class="uw-eye" onclick="var p=document.getElementById('uw-password');p.type=p.type==='password'?'text':'password'" tabindex="-1">&#128065;</button>
                            </div>
                            @error('password')<div class="uw-err">{{ $message }}</div>@enderror
                        </div>
                    </div>
                    <div class="uw-foot">
                        <a class="uw-fgt" href="{{ route('admin.forgot_password.create') }}">Forgot password?</a>
                        <button type="submit" class="uw-btn">Sign In</button>
                    </div>
                </form>
            </div>
            <div class="uw-copy">&copy; {{ date('Y') }} Underwings Cybersecurity Solutions</div>
        </div>
    </div>
</x-admin::layouts.anonymous>
