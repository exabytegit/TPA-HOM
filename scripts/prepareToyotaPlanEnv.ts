type ToyotaPlanEnvironment = "sandbox" | "production";

const normalizeEnvironment = (value: string | undefined): ToyotaPlanEnvironment => {
  if (value === "production") {
    return "production";
  }

  return "sandbox";
};

const printInstructions = (targetEnvironment: ToyotaPlanEnvironment): void => {
  const currentEnvironment = normalizeEnvironment(process.env.TOYOTA_PLAN_ENV);
  const shellValue = `TOYOTA_PLAN_ENV=${targetEnvironment}`;

  console.log(
    JSON.stringify({
      message: "Toyota Plan environment preparation",
      targetEnvironment,
      currentEnvironment,
      note: "This command does not modify .env and cannot persist environment changes to the parent shell."
    })
  );
  console.log("");
  console.log("PowerShell:");
  console.log(`  $env:TOYOTA_PLAN_ENV = "${targetEnvironment}"`);
  console.log("");
  console.log("cmd.exe:");
  console.log(`  set ${shellValue}`);
  console.log("");
  console.log("Then run one of:");
  console.log("  npm run smoke:sandbox");
  console.log("  npm run smoke:production");
};

const target = normalizeEnvironment(process.argv[2]);

if (require.main === module) {
  printInstructions(target);
}
